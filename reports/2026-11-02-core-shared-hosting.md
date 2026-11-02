# CORE共有サーバー確認レポート

確認日時: 2026-11-02 10:54 UTC / 2026-11-02 19:54 JST  
対象: `report.unjuno.org`、既存SSH alias `core`、公開GitHubリポジトリ  
確認方法: 読み取り専用のSSH試行、DNS照会、HTTPS GET、ローカルソースのSHA-256比較

## 確認できた状態

`report.unjuno.org` はDNSでAレコード2件を返し、HTTPS GETには`200`を返しました。ただし、実際に表示された本文はサブドメイン用のplaceholderでした。現時点で、このドメインからAstroホームやAttention解説が配信されているとは確認できません。

COREの共有サーバーへSSHで読み取り専用接続を試みましたが、`core` aliasの公開鍵認証が拒否されました。認証後に実行する予定だったホスト名、作業ディレクトリ、日時、ディレクトリ一覧の確認は実行できていません。

## 根拠と分かること

| 確認項目 | 結果 | 分かること |
| --- | --- | --- |
| DNS | `report.unjuno.org` にAレコード2件 | 名前解決先があること。IPの記録・公開は不要なため、このレポートには値を載せていません。 |
| HTTPS GET | `200`、`text/html`。ブラウザー本文は `This is a placeholder for the subdomain report.unjuno.org` | HTTPSの応答はあるが、目的のホームではないこと。HTTP応答だけではサーバーの所有者、Document Root、配信元を特定できません。 |
| `core` SSH | 公開鍵認証が拒否され、終了コード1 | 認証情報やサーバー上の設定は取得できていないこと。リモートの読み取りコマンドは実行されていません。 |
| GitHubリポジトリ | [Unjuno/report.unjuno.org](https://github.com/Unjuno/report.unjuno.org) にAstroソースあり。`.openai/hosting.json`は静的出力先を`build`に指定 | ローカル保全済みのソース構成。リポジトリがあること自体はCOREへ配置済みである証拠にはなりません。 |
| 公開中のSites版 | [attention-cinema-unjuno.unjuno.chatgpt.site](https://attention-cinema-unjuno.unjuno.chatgpt.site/)、バージョン10、`public` | Codex Sites側では公開されています。`report.unjuno.org`上の公開とは別です。 |
| Sites版とGitHub版のソース比較 | 11ファイル中10ファイル一致。差分は`RIGHTS.md`のみ | Astroコード、ビルド設定、論文ページ、CSS、favicon、Sites設定は一致。権利表示ファイルは各リポジトリ/サイト向けに文面が異なります。 |

## 未確認事項

SSH認証が通らないため、CORE上の仮想ホスト設定、Document Root、実ファイル、所有者・権限、`.htaccess`、Webサーバー種別・設定、TLS終端、バックアップ、公開ゲートは未確認です。したがって、CORE上のLinux、Apache/LiteSpeed、PHP等のランタイムやパッチ状態について評価できる根拠もありません。HTTPヘッダーや版表示だけから安全性・更新状況を推定していません。

このサイトは静的ページとして構成されていますが、CORE上でどの設定・経路を通って配信されるかは未確認です。DNSのAレコード数やplaceholder応答だけでは、共有サーバー全体や他サイトの状態は分かりません。

## パスフレーズ認証についての追記

2026-11-02 14:22 UTC / 23:22 JST に、ユーザーから「通常の対話型SSHでパスフレーズを入力すると接続できる」と報告がありました。こちらの再試行は`BatchMode=yes`の非対話接続で、入力プロンプトを禁止していました。さらに、この実行環境の`ssh-add -l`では読み込み済みidentityがありませんでした。

したがって、今回の`Permission denied`はこの非対話経路で認証できなかったという結果です。ユーザーが対話型接続で使えた鍵やパスフレーズが無効だとは示しません。パスフレーズは通常、秘密鍵をローカルで解錠するためのもので、サーバーへ送ったり、このレポートへ記録したりしていません。共有サーバー内部の状態は、依然として未確認です。

## 実施した変更

サーバー設定、DNS、公開ゲート、ファイル、データベースは変更していません。確認結果だけをこのファイルに記録します。

## 次に行う作業

1. 読み取り専用SSHを行う実行環境で、ユーザーがローカルにSSH agentへ鍵を解錠して読み込む（または対話型の承認済み接続手段を利用する）。秘密鍵やパスフレーズをリポジトリ・会話へ出さない。
2. 接続後、対象ホストと`report.unjuno.org`のDocument Root、仮想ホスト経路、公開ゲート、既存ファイル、復旧用バックアップを確認する。
3. 対象ディレクトリと復旧手段が確認できてから、対象サイトだけを配置し、公開URLでホーム・記事・権利方針ページの本文を確認する。

確認した公開経路: 2026-11-02 19:54 JST。COREへの配置・公開は未実施です。

## 依頼範囲の再確認と静的ビルド

2026-11-02 14:32 UTC / 23:32 JST に、依頼の目的はChatGPT Sites上で新たに公開することではなく、既存のChatGPTサイトで作成済みのAttention教材を参考に、COREの`report.unjuno.org`へ専用ホームと教材を配置して公開することだと再確認しました。先のSites版公開はCOREへの移植・公開を満たしていません。

ローカルGitリポジトリのAstroソースを`npm ci`後に`npm run build`で生成し、ホーム、Attention教材、権利方針の3ページが静的HTMLとして出力されたことを確認しました。依存インストール時のnpm auditは0 vulnerabilitiesでした。これはローカルビルドの確認であり、本番サーバーへの配置や本番URLでの確認を示しません。

COREへの読み取り専用SSHは既存`core` aliasで対話実行すると秘密鍵のパスフレーズ入力待ちになることを確認し、秘密情報を入力・保存せず接続を中断しました。この実行環境のSSH agentにはidentityが読み込まれていないため、共有ホスト内のDocument Root、既存ファイル、バックアップ、公開ゲートをまだ確認できません。安全な配置先と復旧手段を確認できるまで、本番ファイルの変更・公開は行いません。

次の作業は、ローカルで秘密鍵をSSH agentへ読み込んでから、こちらで`core` aliasを使った読み取り専用調査を再開し、対象サイトのDocument Root・現状・復旧手段を確認することです。パスフレーズを会話やレポートへ記録する必要はありません。

## CORE環境確認と公開結果

2026-11-02 14:52 UTC / 23:52 JST 更新。ユーザー提供の画面で対象が`domains/report.unjuno.org/public_html`であることを確認しました。前の応答で`research.unjuno.origin`のように読み違えて対象パスの存在を否定したのは誤りです。CORE上の既存パスと画面の表示は一致しています。

### 実行環境で確認したこと

- SSH alias `core` で `v2007.coreserver.jp` に接続し、実行ユーザー`unjuno`と対象ドキュメントルートを確認。
- 対象ドキュメントルートは `/home/unjuno/domains/report.unjuno.org/public_html`。公開前にはplaceholderの`index.html`（395 bytes）と空の`cgi-bin`のみで、サイト固有の`.htaccess`はありませんでした。
- HTTPS応答ヘッダーはCloudflare経由で`x-turbo-charged-by: LiteSpeed`を示しました。これはHTTP経路上のヘッダーで、共有ホスト全体やWeb worker内部の設定監査を意味しません。
- 非対話SSHのPATHでは`node`/`npm`が見つかりませんでしたが、COREのNVMにNode `v22.23.4`、npm `10.9.9`があり、PATHを指定して実行可能でした。Astro CLIはグローバルにはありません。
- 公開領域外の一時ディレクトリでロックファイルから`npm ci`を実行し、Astro `7.4.4`を起動できることを確認。`astro --version`は成功しましたが、`npm run build`はCORE上で`Aborted (core dumped)`となりました。CORE側でのビルド成功とは扱っていません。クラッシュ原因は未特定です。
- このサイトは`output: "static"`で生成し、ページ内にサーバーランタイム依存を必要としない構成です。ローカルのNode環境では同じロックファイルからビルド成功済みです。その静的出力をCOREへ配置すればAstro/Nodeの本番常駐は不要です。

### バックアップ、配置、公開確認

- 公開前に対象ドメイン一式を`/home/unjuno/application_backups/report_unjuno_org_before_2026-11-02T1450Z.tar.gz`へ保存。SHA-256: `c8e67f7e95346a0c561eccc02c6410dcfe611dd71e2df7fa2ce6d5d28253d891`。
- アーカイブを隔離した一時ディレクトリに展開し、元の`domains/report.unjuno.org`と`diff -r`で一致することを確認後、一時復元データを削除しました。
- 2026-11-02 14:47 UTC / 23:47 JST に、ローカルビルドのホーム、Attention教材、権利ページ、共有CSS、faviconを対象ドメインの`public_html`へ配置。既存`cgi-bin`は維持。ファイルは`0644`、ディレクトリは`0755`。公開後に使った一時ステージとCORE上のビルド検証ソース・依存物は削除済みです。
- 公開後、`https://report.unjuno.org/`、`/notes/attention-is-all-you-need/`、`/rights/`、`/_astro/SiteLayout.CZNAx5tR.css`をGETし、すべてHTTP 200を確認。3 HTMLページのタイトルとCSSの`text/css`応答も確認しました。ブラウザーでホームのナビゲーション、記事カード、説明方針、フッターを表示確認しました。
- これらは到達性と主要HTML/CSSの配信確認です。論文内容の独立した学術レビュー、画面サイズごとの詳細なビジュアル確認、全リンクの巡回、Web workerの脆弱性監査までは実施していません。

現在の状態: `report.unjuno.org`はCORE上で静的サイト公開中。復旧手段は上記の対象ドメインバックアップです。次回はローカルでAstroをビルドし、`build/`だけをバックアップ後に対象`public_html`へ配置し、主要URLとアセットを確認してください。CORE上のAstroビルドabort原因を調べる場合は、公開経路を変更せず別の使い捨てディレクトリで再現調査してください。
