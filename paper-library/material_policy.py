"""Load the sole HOME editor input and admit only integrated authored materials.

Display records are derived, never read back from generated papers.json. This
structural gate does not certify completeness or quality of authored lessons.
"""
from pathlib import Path
import json
import re

# Optional presentation compatibility for the existing Attention card. These
# facts are not editor fields, admission entries, or defaults for other works.
# Never put title, authors, summary or the learning URL here.
LEGACY_PRESENTATION = {
    'attention-is-all-you-need': {
        'year': 2017, 'category': '計算・言語', 'visual': 'attention',
        'tags': ['Transformer', 'Self-attention', '機械翻訳', '位置符号', 'エンコーダ・デコーダ'],
        'doi': '10.48550/arXiv.1706.03762',
    },
}


def normalize_material_url(value):
    """Accept a root-relative authored route, with an optional trailing slash.

    Strip outer whitespace only. Exact ASCII path matching rejects origins,
    schemes, queries, fragments, encodings, backslashes and dot segments before
    any URL parser or filesystem can normalize them into a different target.
    """
    if not isinstance(value, str):
        raise ValueError('url must be text')
    route = value.strip()
    match = re.fullmatch(r'/notes/([a-z0-9]+(?:-[a-z0-9]+)*)/learn/?', route)
    if not match:
        raise ValueError('Invalid authored learning URL: use /notes/<slug>/learn/')
    return match[1], f'/notes/{match[1]}/learn/'


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f'Duplicate JSON field: {key}')
        result[key] = value
    return result


def load_materials(library: Path) -> tuple[list, dict]:
    """Return compatible display records and slug-to-route map from four fields."""
    records = json.loads((library / 'content/integrated-materials.json').read_text(), object_pairs_hook=unique_object)
    if not isinstance(records, list):
        raise ValueError('integrated-materials.json must be an array')
    papers, materials = [], {}
    for index, record in enumerate(records):
        if not isinstance(record, dict) or set(record) != {'title', 'authors', 'summary', 'url'}:
            raise ValueError(f'materials[{index}] must have exactly title, authors, summary and url')
        for field in ('title', 'summary'):
            if not isinstance(record[field], str) or not record[field].strip():
                raise ValueError(f'materials[{index}].{field} must be nonempty text')
        authors = record['authors']
        if not isinstance(authors, list) or not authors or any(
            not isinstance(author, str) or not author.strip() for author in authors
        ):
            raise ValueError(f'materials[{index}].authors must be a nonempty array of nonempty strings')
        authors = [author.strip() for author in authors]
        slug, route = normalize_material_url(record['url'])
        if slug in materials:
            raise ValueError(f'Duplicate integrated material URL: {route}')
        source = library.parent / 'src/pages' / route.lstrip('/') / 'index.astro'
        if not source.is_file() or not source.read_text().strip():
            raise ValueError(f'Missing integrated learning route: {route}')
        wrapper = source.read_text()
        imported = re.fullmatch(
            r'\s*---\s*import\s+(\w+)\s+from\s+["\']([^"\']+)["\'];?\s*---\s*'
            r'<Fragment\s+set:html=\{\1\}\s*/>\s*', wrapper
        )
        extra = {
            'deep-residual-learning': ('build.mjs', 'content/units.json', 'https://arxiv.org/abs/1512.03385'),
            'generative-adversarial-nets': ('src/build.mjs', 'content/units.mjs', 'https://arxiv.org/abs/1406.2661'),
        }.get(slug)
        expected = library.parent / 'experiences' / slug / ('public/index.html' if extra else 'build-production/index.html')
        if not imported or not imported[2].endswith('?raw') or (
            source.parent / imported[2][:-4]
        ).resolve() != expected.resolve():
            raise ValueError(f'Unimplemented learning route wrapper: {route}')
        package = expected.parent.parent
        required_files = (extra[0], extra[1], 'src/app.mjs', 'src/math.mjs') if extra else ('content/experience.json', 'tools/build-site.mjs', 'src/site/lessons.mjs')
        for required in required_files:
            path = package / required
            if not path.is_file() or not path.read_text().strip():
                raise ValueError(f'Missing authored learning source: {slug}/{required}')
        if extra:
            if slug == 'deep-residual-learning':
                units = json.loads((package / extra[1]).read_text())
                if not isinstance(units, list) or len(units) != 5:
                    raise ValueError(f'Learning material has no authored units: {slug}')
            elif not all(f"lab:'{unit}'" in (package / extra[1]).read_text() for unit in ['roles', 'objective', 'optimal', 'equilibrium', 'training', 'saturation', 'evidence']):
                raise ValueError(f'Learning material has no authored units: {slug}')
            experience = {'primary_paper_url': extra[2]}
        else:
            experience = json.loads((package / 'content/experience.json').read_text())
            if not isinstance(experience, dict) or not isinstance(experience.get('units'), list) or not experience['units']:
                raise ValueError(f'Learning material has no authored units: {slug}')
            if experience.get('slug') != slug:
                raise ValueError(f'Authored learning source identity does not match URL: {slug}')
        paper = {
            'slug': slug, 'title': record['title'].strip(),
            'authors': authors[0] + (' et al.' if len(authors) > 1 else ''),
            'authors_full': authors, 'summary_ja': record['summary'].strip(),
            'claim': record['summary'].strip(), 'url': route,
            'year': '', 'category': '', 'tags': [], 'visual': 'network',
            'preserve': (library / 'dist/notes' / slug / 'index.html').is_file(),
        }
        paper.update(LEGACY_PRESENTATION.get(slug, {}))
        # The primary paper is evidence belonging to the authored experience;
        # it is not the HOME destination and cannot override the editor URL.
        if isinstance(experience.get('primary_paper_url'), str):
            paper['primary_paper_url'] = experience['primary_paper_url']
        papers.append(paper)
        materials[slug] = route
    return papers, materials
