# 対話UI

content/experience.json の interaction.component_id ごとに実装します。最初は query-key と scaled-softmax の2単位を通して作り、動画から操作へ自然につながるか検証します。

数値処理はsrc/mathへ分離します。手で構成した数値、学習済み重み、原論文の報告値を混同しません。操作ごとに初期値、期待する変化、リセット、キーボード操作、表示のフォールバックを用意します。現時点で対話UIの実装はありません。

