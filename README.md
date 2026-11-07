# 桃色重装ぼんぼぼん (MOMOIRO JUUSOU BON-BO-BON)

RETRO-16BIT / 1990年代OVAアニメ調の16ビット美少女メカをそのままピンボール盤面として攻略する、**スマホ縦画面・本格ピンボール × ローグライク盤面ビルドゲーム**。

## ディレクトリ構成

- `index.html` — ゲームメイン画面
- `css/style.css` — RETRO-16BIT風走査線（スキャンライン）・ネオン枠・レイアウト定義
- `js/audio.js` — Web Audio APIによるFM音源風シンセサイザーSEエンジン (`RetroSoundEngine`)
- `js/game.js` — サブステップ物理演算、部位破壊＆ソフトバウンス（ぷるぷる）バネ物理、アルカノイド型カプセル回収、常設ビルド＆バフ一斉解放（BURST）システム
- `js/stage1_assets.js` — `file://` 直開き時でもCanvasピクセル操作がCORSブロックされないためのバンドルデータ
- `assets/stage1/`
  - `centerpiece.jpg` — STAGE 1「サイバーバニー（RABI-MECH）」縦長メインビジュアル
  - `faces/` — 1ドット単位で二重まぶた線・まつ毛を処理した顔差分PNGパッチ一式（`blink.png`, `wink.png`, `wince.png`, `shout.png`, `talk.png`, `talk_sm.png`, `open_blush.png`）

## コアメカニクス

1. **重装美少女＝ステージ盤面そのもの（3フェーズ制ボス攻略）**
   - **PHASE 1: 外装アーマー破壊**: 左右のショルダーポッド（HP各3）を撃破。この間、胸部は硬質な「CHEST ARMOR」で覆われており、ボールが左右やすり抜けレーンから下へ素直に流れる。
   - **PHASE 2: 胸部装甲パージ**: 胸部装甲（HP 4）にボールを当てて破壊すると「💥CHEST ARMOR PURGE!!」。柔らかいバストが露出し、2D減衰バネ物理による「ぷるぷるソフトバウンス」ギミックが解禁！さらに両耳センサーを通すと弱点胸コアのロックが解除。
   - **PHASE 3: コア直撃（OVERHEAT!!）**: 露出した黄色い胸コア（HP 6）を叩き込むと「STAGE CLEAR (KO!!)」達成！
2. **アイテム回収（案A：ボール直撃回収方式）**
   - カプセルは落下するのではなく、盤面の狙いがいのある場所（ドローン下や肩跡地、オービット上部など）に**「浮遊ホロカプセル」**として滞留出現。
   - ボールをフリッパーでキープし、カプセルを狙い撃って直撃させることで回収！
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
   - クリア時に「大破・敗北・装甲パージCG（RETRO-16BIT風ドット絵1枚絵）」が表示。
   - ボスの武装パーツを1つ鹵獲（「ウサミミ・レーダー」「電磁スプリング」「セーフティ・ドローン」）して次のステージへ引き継ぎ！

## アートスタイル・プロンプト基準

```text
Authentic Japanese 16-bit RETRO-16BIT pixel art illustration, no text, no UI.
Character design strictly in the style of 1989-1992 anime adaptation of Ranma 1/2 (Atsuko Nakajima character designer) and Urusei Yatsura OVA (Akemi Takada style): classic 1990s Studio Deen / Kitty Film anime bishoujo face with big, tall, expressive rounded-square anime eyes, large crisp white oval highlight at the top of the iris, defined upper eyelash line, tiny cute upturned nose dot, sweet playful cat-like smile, fluffy voluminous 1990s arched bangs.
Ultra-thin delicate 1-pixel dark violet outlines (NO thick black cartoon lines, NO chibi round cheeks, NO glossy 3D shading), flat matte cel-shaded color planes with subtle ordered Bayer checkerboard dithering along the neck and cheek edges.
Bold avant-garde retro-futuristic color palette: electric magenta, acid yellow, mint cyan, deep ultramarine purple.
```
