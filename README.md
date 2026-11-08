# 桃色装甲ボンぼや〜ジュッ！ (MOMOIRO SOUKOU BON-VOYAGE!)

新世代サイバーパンク・美少女メカをそのままピンボール盤面として攻略する、**スマホ縦画面・本格ピンボール × ローグライク盤面ビルドゲーム**。

## ディレクトリ構成

- `index.html` — ゲームメイン画面
- `css/style.css` — ネオサイバー走査線（スキャンライン）・ネオン枠・レイアウト定義
- `js/audio.js` — Web Audio APIによるFM音源風シンセサイザーSEエンジン (`FMSoundEngine`)
- `js/engine/physics.js` — サブステップ物理演算、フリッパー＆プランジャー、ナッジ反発
- `js/engine/particles.js` — 装甲破片・衝撃波・スパークパーティクル描画
- `js/engine/systems.js` — フィーバーシステム、ホロカプセル生成、スキルショット判定
- `js/engine/ui.js` — HUD更新、カットイン表示、タッチ＆フリッパー入力制御
- `js/stages/stage1.js` — ステージ1（桃色装甲リリス）専用ギミック・衝突判定・描画
- `js/stages/stage2.js` — ステージ2（疾風紫電セルティ）専用ギミック・衝突判定・描画
- `js/engine/game_engine.js` — メインゲームループ・盤面更新・ボール管理
- `js/main.js` — エントリポイント・ステージ遷移・UIアクション連動

## コアメカニクス

1. **重装美少女＝ステージ盤面そのもの（3フェーズ制ボス攻略）**
   - **PHASE 1: 外装アーマー破壊**: 左右の腕部・肩部装甲を撃破。
   - **PHASE 2: 胸部装甲パージ**: 胸部装甲にボールを当てて破壊すると「💥CHEST ARMOR PURGE!!」。柔らかいバストが露出し、2D減衰バネ物理による「ぷるぷるソフトバウンス」ギミックが解禁！さらに胸ばいんでクロッチ吸引が強化。
   - **PHASE 3: コア直撃（OVERHEAT!!）**: 露出した弱点コアを叩き込むと「STAGE CLEAR (KO!!)」達成！
2. **アイテム回収（ボール直撃回収方式）**
   - カプセルは落下するのではなく、盤面の狙いがいのある場所に**「浮遊ホロカプセル」**として滞留出現。
   - ボールをフリッパーでキープし、狙い撃って直撃させることで回収！
3. **プランジャー＆スキルショット（開幕ボーナス）**
   - 画面右下のスプリングプランジャーを引っ張り（`S/↓`長押しまたは画面タップ）、パワーゲージを溜めて離して発射。
   - スキルショット判定（パワー約70%〜84%）：上部センサーを通せば「★SKILL SHOT!! +25,000pts」＆レアカプセル即時出現！
4. **BOMB-O-FEVER（フィーバーモード＆緩急）**
   - ターゲットやバンパーヒットで「FEVER GAUGE」が蓄積。
   - 100%になると「BOMB-O-FEVER」突入！
     - **マルチボール発動**（ボールが2個追加され盤面に計3個乱舞！）
     - バストが「メガ・バスト（超巨大化＆高反発）」に！
     - スコア倍率 ×5.0
     - 浮遊カプセルが盤面に2個即時出現
5. **パワーアップ調整と耐久度**
   - 股下ストッパー（CENTER POST）は「3回耐久（HP 3）」。ボールを3回弾くと割れて消滅。
   - キックバックは1回救出で消費。
6. **ステージクリアご褒美（大破CG＆鹵獲レリック選択）**
   - クリア時に「大破・敗北・装甲パージCG」が表示。
   - ボスの武装パーツを1つ鹵獲（「ウサミミ・レーダー」「電磁スプリング」「支援ドローン」）して次のステージへ引き継ぎ！

## アートスタイル・プロンプト基準

```text
Authentic Japanese cyberpunk pixel art illustration, no text, no UI.
Character design: classic 1990s anime bishoujo face with big, tall, expressive eyes, defined upper eyelash line, tiny cute upturned nose dot, sweet playful smile, voluminous arched bangs.
Ultra-thin delicate 1-pixel dark violet outlines, flat matte cel-shaded color planes with subtle ordered Bayer checkerboard dithering.
Bold avant-garde neo-cyber color palette: electric magenta, acid yellow, mint cyan, deep ultramarine purple.
```
