# HOMEと論文サイトの共通ヘッダー・制作支援カード

Attention教材で利用する独立した部品です。HOMEや既存記事のCSS・操作は変更しません。

## 同じもの・変えるもの

- 共通：report.unjuno.orgのブランド、濃色のヘッダー、文字組み、余白、リンク、フォーカス表示、制作支援カードの構造。
- ページごと：補助表示、目次などのリンク、支援カードの見出しと説明、重複しないID。
- 支援先は確認済みの https://github.com/sponsors/Unjuno のみ。資金提供を受けた・スポンサーが付いたという意味の表示、架空の企業ロゴ、支援者数を作りません。

## 設定と利用

content/site-chrome.jsonにHOMEとAttentionの文言を分けています。renderHeader({...brand, ...variant.header})とrenderSponsor(variant.sponsor)はHTMLを返します。テキストはエスケープし、URLはHTTPS・サイト内パス・単純なアンカーのみを許可します。src/shared/site-chrome.cssを読み込みます。

静的ビルドやAstroから同じレンダラーを利用できます。ヘッダーと支援カード自体にJavaScriptは不要です。AstroでHTMLを挿入する場合は、このレンダラーの返り値のみを使い、利用者由来の生HTMLを渡しません。

ブラウザで既存UIへ組み込む場合はmountHeader(container, config, {tools:[既存のHTMLElement]})が使えます。HOMEのフィルター、音声切替などを生HTML文字列で渡さず、既存DOMを移動することでID・状態・イベントを保ちます。ただしHOMEの機能・スタイルの回帰テストは別途必要です。既存UIを削除して共通化済みとしないでください。

mountSponsor(container, config)も用意しています。CSSはreport-接頭辞で隔離し、HOMEの背景・音声・ページ送りに依存しません。スティッキーなheaderは適切なページ上部に置き、主コンテンツのidをmainIdと一致させます。mountHeaderのcontainerを使う場合、必要に応じコンテナ側にもsticky位置を設定してください。

支援カードは論文体験の最後に配置します。HOME側の繰り返し回数や挿入位置はHOMEの責務です。同一ページに複数置く場合は一意なidを渡します。カードが原論文の著者や所属先への支援だと誤解されないようにします。

## アクセシビリティ

本文へのスキップリンク、44px以上のリンク領域、キーボードフォーカス、支援カード見出しとの関連付け、新しいタブの案内を用意しています。見た目だけでなく通常リンクとして動き、カードに自動再生や追跡はありません。本文アンカーにはヘッダー分のscroll-marginを設定します。

## 検証

site-chrome.test.mjs がHTML構造、URL検証、エスケープなどを確認します。site-production.test.mjs が公開用のHOME・旧本文・著作権方針へのリンクを確認します。実ブラウザでの表示・操作は未確認です。
