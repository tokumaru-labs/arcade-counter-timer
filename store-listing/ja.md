# Chrome ウェブストア掲載情報 — ja

Developer Dashboard の各項目へそのまま貼り付けられる形にしています。
0.1.2 に実装されていない機能は記載していません。
ポップアップの UI 表記は 0.1.2 でも英語のままです（ローカライズ対象は
ストア掲載名と説明文のみ）。

---

## 名前（Name）

英語名のまま使用します。

```
Arcade Counter Timer
```

## 概要（Summary / 短い説明）

最大132文字。以下は42文字で、`_locales/ja/messages.json` の
`extensionDescription` と一致しています。

```
爽快な節目演出とローカル統計を備えた、シンプルなカウントアップタイマー＆カウンター。
```

## カテゴリ

**仕事効率化（Productivity）**

統計を持つタイマーとカウンターという作業用ツールです。アーケード風の演出は
見せ方であって、ゲーム機能ではありません。

## 言語

日本語。英語版の掲載文は `en-US.md` にあります。

---

## 詳細な説明（Detailed description）

```
Arcade Counter Timer は、カウントアップタイマーとカウンターを1つの小さなポップアップにまとめた拡張機能です。作業中は静かに佇み、節目に到達した一瞬だけ、小さなアーケード機のような手応えを返します。

■ タイマー
START で計測を開始し、STOP で停止します。表示は HH:MM:SS 形式で、100時間を超えても桁が崩れません。経過時間は動き続けるスクリプトではなく保存したタイムスタンプから計算しているため、ポップアップを閉じても、ブラウザを再起動しても計測は続きます。

■ カウンター
COUNT ボタン、または Space キーで1増えます。1回の入力は必ず1カウントです。キーを押しっぱなしにしても数字が勝手に増え続けることはありません。

■ リセット
すべてのリセットは長押し式なので、誤ってクリックしてもセッションが消えることはありません。RESET TIMER はタイマーだけ、RESET COUNT はカウントだけ、SESSION RESET は両方をリセットします。いずれも統計には影響しません。タイマーが動作中だった場合は、それまでの経過時間を正しい日付へ加算してから停止します。

■ 統計
歯車アイコンを押すと、TODAY・WEEK・MONTH・YEAR それぞれの時間とカウントの合計を確認できます。保存しているのは日別の履歴だけで、より長い期間はそこから計算するため、週や月が変わっても数字がずれません。深夜0時をまたいだ時間は分割して各日に振り分けます。

■ 節目の演出
一定のテンポでカウントを続けると、GOOD!、NICE!、GREAT!、FANTASTIC! といった短い言葉が浮かびます。セッションの10回ごとには、代わりに CHAIN 演出が発生し、上昇するアルペジオ、わずかな火花、柔らかなフラッシュを伴います。演出は数百ミリ秒で消え、操作を妨げません。

■ サウンド
効果音はすべて Web Audio API により拡張機能内で生成しています。音声ファイルもダウンロードもありません。サウンドはオフにできます。

■ 設定
サウンド、Fly Text、CHAIN 演出、控えめな CRT 走査線は、それぞれ個別にオン・オフを切り替えられます。CLEAR ALL DATA は確認ダイアログを経て、すべてを初期値へ戻します。システムの「視覚効果を減らす」設定にも対応しています。

■ キーボード
Enter でタイマーの開始・停止、Space でカウント、R の長押しでセッションリセット、Esc で統計画面から戻ります。

■ プライバシー
Arcade Counter Timer は端末内だけで動作します。要求する権限は storage の1つだけで、host_permissions はありません。content script も background service worker も持たないため、閲覧中のページを見ることはできません。外部通信を行わず、リモートコードを含まず、アカウント・広告・アナリティクス・クラウド同期のいずれもありません。タイマーの状態、カウント、日別履歴、設定はローカルの拡張機能ストレージに保存され、端末外へ出ることはありません。

GPL-3.0-only のオープンソースソフトウェアです。
```

---

## 主な機能（他項目の記入用メモ）

- 100時間を超えても正しく表示され、ポップアップを閉じても継続するカウントアップタイマー
- 1入力につき必ず1増えるカウンター
- 明示的な START / STOP ボタンと COUNT ボタン
- タイマーとカウントの個別リセット、および両方のセッションリセット（すべて長押し）
- ローカルの日別履歴から算出する TODAY / WEEK / MONTH / YEAR 統計
- 連続カウント時の Fly Text と、10回ごとの CHAIN 演出
- すべて切り替え可能なオリジナル Web Audio 効果音
- オフライン動作、アカウント不要

## キーボードショートカット

| キー | 動作 |
| --- | --- |
| Enter | タイマーの開始・停止 |
| Space | カウント +1 |
| R（650ms 長押し） | セッションリセット |
| Esc | 統計画面から戻る |

ブラウザ全体のコマンドショートカットは登録していません。上記はポップアップ内でのみ有効です。

---

## 単一用途（Single purpose）

英語での申告文：

```
Arcade Counter Timer provides a local count-up timer and tally counter with optional milestone effects and time-based statistics.
```

日本語での説明：ローカル動作のカウントアップタイマーとカウンターを提供し、
任意の節目演出と時間ベースの統計を備えたツールです。

## 権限の理由（storage）

英語での申告文：

```
The storage permission is used to save timer state, session count, daily history, and user settings locally so they remain available after the popup closes or the browser restarts.
```

日本語での説明：タイマーの状態、セッションカウント、日別履歴、ユーザー設定を
端末内に保存し、ポップアップを閉じた後やブラウザ再起動後も保持するために使用します。
これ以外の権限、host_permissions、content script、background service worker は使用しません。

## リモートコード

```
No. The extension does not use remote code.
```

JavaScript はすべてパッケージ内に含まれています。外部スクリプト、CDN 参照、
`eval`、`new Function`、動的なコード取得はいずれもありません。

## データの取り扱い

```
The extension does not transmit user data. Timer, counter, history, and settings data remain in chrome.storage.local.
```

収集・販売・共有・第三者提供はいずれも行いません。項目ごとの回答は
`privacy-declarations.md` を参照してください。

## サポート情報

サポート窓口は公開リポジトリの GitHub Issues です。

```
https://github.com/tokumaru-labs/arcade-counter-timer/issues
```

ホームページ URL、プライバシーポリシー URL とあわせて `urls.md` から記入します。
