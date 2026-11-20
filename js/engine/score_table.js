// =========================================================================
// SCORE TABLE — 全スコア値の一元管理（バランス調整はこのファイルだけを触る）
// =========================================================================
// ・値はすべて「基礎点」。実際の加点は Systems.addScore で
//   基礎点 × SCORE_SCALE × baseMultiplier × burstMultiplier × fever.mult になる。
// ・倍率を通さない固定ボーナス／ペナルティも基礎点で書き、Systems.scaled() で SCORE_SCALE を掛ける。
// ・ステージ側は数値リテラルを書かず、必ず ScoreTable.stageN.KEY を参照すること。

window.ScoreTable = {
  // 表示スケール（全加点・減点・ボーナスに一括で掛かる）
  SCORE_SCALE: 1,

  // カンスト上限（10桁カウンターストップ：99億9999万9999点）
  SCORE_CAP: 9999999999,

  // ランク判定しきい値（実スコア）
  // S = ノーミス普通クリア帯（約6,000万〜8,500万）、SS = 億超え、SSS = ハイスコアラー領域
  RANK_THRESHOLDS: [
    { rank: "SSS", min: 250000000 },
    { rank: "SS",  min: 110000000 },
    { rank: "S",   min: 55000000 },
    { rank: "A",   min: 30000000 },
    { rank: "B",   min: 12000000 }
  ],

  // BURST解放の倍率計算パラメータ（加算＋複数枠シナジー＋手札役ボーナス、上限10.0倍）
  burst: {
    TIER_STEP: 0.75,                   // Tier係数 = 1 + (tier - 1) * 0.75 (T1=1.0, T2=1.75, T3=2.5)
    SLOT_SYNERGY_STEP: 0.20,           // 枠シナジー = 1 + 0.20 * (枠数 - 1)
    MAX_MULT: 10.0,                    // BURST倍率の上限
    HAND_TRINITY: 1.15,                // 役ボーナス：3種揃い
    HAND_OVERCLOCK: 1.25,              // 役ボーナス：重複スロットまたは★3+複数枠
    HAND_FULL_DRIVE: 1.35,             // 役ボーナス：全4種コンプリート
    FULL_DRIVE_EXTRA_SEC: 4,           // FULL DRIVE時のBURST時間延長（秒）
    BURST_CORE_ADD_MULT: 0.6,          // レリック「バースト・リアクター」1個あたり倍率加算
    BURST_CORE_EXTRA_SEC: 4            // レリック「バースト・リアクター」1個あたり時間延長（秒）
  },

  // ステージ制限時間（5分カウントダウン ➔ 残り1秒につき素点+1%［最大×2.00］／0:00超過で毎フレーム減点）
  stageTimer: {
    LIMIT_FRAMES: 60 * 300,                // 各ステージ制限時間: 5分（300秒 = 18,000f）
    WARN_YELLOW_FRAMES: 60 * 60,           // 残り1分以下で黄色表示
    WARN_RED_FRAMES: 60 * 30,              // 残り30秒以下で赤点滅
    TIME_BONUS_PCT_PER_SEC: 1,             // クリア時の残り1秒あたり +1% (+0.01倍)
    TIME_BONUS_MAX_PCT: 100,               // 残り時間倍率ボーナス上限 +100% (最大 ×2.00 で頭打ち)
    OVERTIME_DRAIN_BASE_PER_FRAME: 500,    // 超過時の基礎減点/f（初期 約500pts/f ≒ 3万pts/秒）
    OVERTIME_DRAIN_ACCEL_PER_SEC: 180,     // 超過1秒ごとの減点加速/f
    OVERTIME_DRAIN_RATIO_PER_FRAME: 0.00025 // 現在スコア比例の毎フレーム減点（約1.5%/秒）
  },

  // 永パ（挟まり・無限カプセル）防止パラメータ
  antiStall: {
    BUMPER_GRACE_FRAMES: 10,               // バンパー・バウンス連続ヒット防止クールダウン
    STAGE1_EARLY_JACKPOT_MAX_DROPS: 3,     // Stage 1 両耳解除コアのカプセル放出上限
    BLUSH_CAPSULE_MAX_DROPS: 6             // 赤面オーバーフロー系のカプセル放出上限（各ステージ）
  },

  // 倍率を通さない固定ボーナス・ペナルティ（SCORE_SCALE=1 実スコア基準）
  bonus: {
    CLEAR_PER_STAGE: 1000000,          // ステージクリア: 100万 × ステージ番号（1面100万〜5面500万）
    NO_MISS_PER_STAGE: 1200000,        // ステージノーミス: 120万 × ステージ番号（1面120万〜5面600万）
    PERFECT_ENDING: 5000000,           // 全ステージノーミスでエンディング到達（+500万）
    PRACTICE_START: 500000,            // 練習モード開始時の持ち点（50万）
    MISS_PENALTY_MIN_PER_STAGE: 300000,// ミス時の最低減点: 30万 × ステージ番号
    MISS_PENALTY_RATIO: 0.35,          // ミス時の減点率（現在スコアに対する割合）
    FLIPPER_WHIFF_PENALTY: 300,        // フリッパー空振り
    NUDGE_PENALTY: 5000                // 台揺らし
  },

  // レリック強化値・トレードオフ補正
  multiplier: {
    RADAR_ADD_MULT: 0.30,              // レリック「ウサミミ・レーダー」1個あたりの恒久倍率加算
    HIGH_RISK_ADD_MULT: 0.5963,        // デッキ「ハイリスク増幅器」の恒久倍率加算（東亜プランの王道ボーナス数 5963）
    SPRING_ADD_POWER: 0.15,            // レリック「電磁スプリング」1個あたりの打撃力加算（+15%）
    LILITH_GRAVITY_SCORE_MULT: 0.70,   // レリック「反転グラビティ・コア」所持時の獲得スコア補正（-30%）
    LILITH_GRAVITY_FEVER_MULT: 0.75    // レリック「反転グラビティ・コア」所持時のFEVER蓄積補正（-25%）
  },

  // 全ステージ共通のテーブル要素（基礎点・倍率適用）
  common: {
    SLINGSHOT: 200,
    FLIPPER_HIT: 50,
    KICKBACK_SAVE: 3000,
    COUNTER_SHOT: 3000,                // 落下球をプランジャーで打ち返し
    PERM_MAX_REPAIR: 3500,             // 永続強化カプセル（最大Lv時）
    WIRE_RAMP_ENTRY_DEFAULT: 5500,     // ワイヤーランプ進入（ステージ側で未指定時）
    VOLT_CHAIN: 1500,                  // BURST電撃貫通チェイン追撃
    VOLT_SHATTER: 1500,                // BURST電撃貫通による妨害弾粉砕
    CHAKRA_SLASH: 2000,                // 夜桜・風魔チャクラ追撃刃
    FISSION_SPLIT: 2500,               // 紫電分裂プリズム核分裂マルチボール
    AEGIS_INTERCEPT: 3000,             // イージス迎撃ビット妨害弾迎撃
    AEGIS_WARP_SAVE: 3000              // イージス迎撃ビット緊急ワープ救出
  },

  // Stage 1: 桃色装甲リリス
  stage1: {
    VENT_HIT: 4000,                    // 胸部排気口ヒット
    TORSO_PURGE_VENT: 20000,           // 排気口経由での胸部装甲パージ
    TORSO_PURGE_PLATE: 18000,          // 胸部プレート経由での胸部装甲パージ
    TORSO_PLATE_HIT: 1500,             // 胸部プレートヒット
    TORSO_RICOCHET: 400,               // 胸部プレート跳弾
    ALL_ARMOR_PURGE: 40000,            // 全3部位装甲パージ達成ボーナス
    BUST_IMPULSE: 500,                 // バスト揺れ基礎加点（デバッグ/補助用）
    BUST_SOFT_NORMAL: 1800,            // パージ後バストヒット（通常）
    BUST_SOFT_FEVER: 3200,             // パージ後バストヒット（Fever中）
    DRONE_HIT: 2000,                   // 護衛ドローンヒット
    DRONE_DESTROY: 6000,               // 護衛ドローン撃破
    BASE_MULT_DRONE: 0.10,             // ドローン撃破時の恒久倍率加算
    DRONE_EX_BUMP: 1000,               // 撃破後ドローンバンパー
    EAR_SKILL_SHOT: 25000,             // 垂れ耳スキルショット
    EAR_DAMP: 1000,                    // 垂れ耳クッション通常ヒット
    ARM_SHIELDED: 500,                 // シールド中の腕装甲ヒット
    ARM_HIT: 2000,                     // 腕装甲ヒット
    ARM_PURGE: 12000,                  // 腕装甲パージ
    ARM_EX_SPARK: 1200,                // 破壊後の腕バンパー
    HIP_HIT: 2500,                     // 腰ユニットヒット
    HIP_OVERHEAT: 8000,                // 腰ユニット破壊
    BASE_MULT_HIP: 0.15,               // 腰ユニット破壊時の恒久倍率加算
    HIP_SPARK: 1200,                   // 破壊後の腰バンパー
    GRAV_RESIDUE: 800,                 // 冷却中のGRAV CORE接触
    GRAV_TRAP_PER_CHARGE: 3000,        // GRAV COREチャージ（×charge）
    GRAV_OVERLOAD: 18000,              // GRAVITY OVERLOAD達成
    CORE_HIT: 8000,                    // Phase 3 コアヒット
    CORE_JACKPOT: 500,                 // 両耳解除時の早期コアジャックポット
    CORE_SHIELDED: 1000                // シールド中のコアヒット
  },

  // Stage 2: 疾風紫電セルティ
  stage2: {
    LASER_FISSION: 12000,              // ホロレーザー直撃分裂
    LASER_HIT: 5000,                   // ホロレーザーかすりノックバック
    LASER_DODGE: 3000,                 // ホロレーザーニアミス回避
    ANTENNA_REPEL: 4000,               // 放電中アンテナ反発ヒット
    ANTENNA_GATE_PASS: 8000,           // 非放電中アンテナ通過ゲート
    ANTENNA_DESTROY: 25000,            // アンテナ破壊
    SHOULDER_HIT: 3000,                // 左肩装甲ヒット
    SHOULDER_PURGE: 30000,             // 左肩装甲破壊
    SHOULDER_SPARK: 3500,              // 破壊後の左肩バンパー
    ARM_HIT: 3500,                     // 肘装甲ヒット
    ARM_DESTROY: 30000,                // 肘装甲破壊
    ARM_SPARK: 2500,                   // 破壊後の肘バンパー
    NOZZLE_ARMORED: 1500,              // Phase 1 装甲保護中のノズルヒット
    NOZZLE_HIT: 4000,                  // 背中ノズルヒット
    NOZZLE_DESTROY: 25000,             // 背中ノズル単体破壊
    ALL_THRUSTERS_DOWN: 30000,         // 両ノズル完全破壊ボーナス
    NOZZLE_SCRAP: 2000,                // 破壊後のノズルバンパー
    HOLO_SCRAP: 2000,                  // 破壊後のホロ砲台バンパー
    HOLO_SHIELDED: 1500,               // シールド中のホロ砲台ヒット
    HOLO_HIT: 6000,                    // ホロ砲台ヒット
    HOLO_DESTROY: 40000,               // ホロ砲台破壊
    BUST_ARMORED: 1500,                // Phase 1 ロック中の胸先端ヒット
    BUST_TIP_HIT: 12000,               // 胸先端ヒット（未破壊）
    BUST_ARMOR_PURGE: 30000,           // 胸先端装甲パージ
    BUST_TIP_SENSITIVE: 12000,         // パージ後の胸先端ヒット
    CORE_HIT: 15000,                   // Phase 3 リアクターコアヒット
    CORE_OVERDRIVE: 5000,              // コアオーバードライブ（予備分岐）
    CORE_SHIELDED: 1500,               // シールド中のコアヒット
    HIP_BUMPER: 4500,                  // 左足付け根バンパー
    CAT_EAR_BOUNCE: 3500,              // 猫耳三角バウンス板
    ALL_ARMORS_PURGED: 50000           // Phase 2 全装甲パージ達成
  },

  // Stage 3: 電脳空間ノア
  stage3: {
    BUST_IMPULSE: 1800,                // バスト揺れ基礎加点（impulseBust）
    SNIPE_LOCK_BROKEN: 5000,           // ロックオン中の台揺らしロック破壊
    SNIPE_JUST_EVADE: 8000,            // 発射後の台揺らしジャスト回避
    HAND_CATCH_BASE: 4000,             // 両手吸引捕獲（基礎）
    HAND_CATCH_PER_LV: 1200,           // 両手吸引捕獲（×LV加算）
    HAND_THROW_BASE: 7000,             // 両手ワープ射出（基礎）
    HAND_THROW_PER_LV: 1500,           // 両手ワープ射出（×LV加算）
    DELTA_BEAM_HIT: 2400,              // 3機デルタビーム反射
    ANTENNA_SKILL_SHOT: 25000,         // アンテナスキルショット
    ANTENNA_BOUNCE: 3000,              // アンテナ通常バウンス
    BIT_SKILL_SHOT: 20000,             // 上段ビットスキルショット
    BIT_HIT: 3500,                     // 浮遊ビットヒット
    BIT_DESTROY: 22000,                // 浮遊ビット撃破
    HAND_OPEN_BOUNCE: 2800,            // 通常時の両手バウンス
    HIP_PORT_HIT: 3600,                // 腰ポートヒット
    BASE_MULT_HIP_PORT: 0.15,          // 腰ポート破壊時の恒久倍率加算
    HIP_PORT_OVERLOAD: 20000,          // 腰ポート破壊
    HIP_PORT_SPARK: 4200,              // 破壊後の腰ポートバンパー
    RIBBON_BOUNCE: 2800,               // ガーターリボン（腰ポート破壊前）
    RIBBON_BOUNCE_BOOSTED: 4500,       // ガーターリボン（腰ポート破壊後）
    BOOT_BOUNCE: 2400,                 // 左足ブーツキッカー
    KNEE_PAD_HIT: 3500,                // 右膝当てヒット
    KNEE_PAD_PURGE: 25000,             // 右膝当て破壊（Phase 2解放）
    KNEE_BOUNCE: 2400,                 // 破壊後の右膝バンパー
    BUSTIER_LOCKED: 1200,              // Phase 1 ロック中のビスチェ
    BUSTIER_HIT: 4500,                 // Phase 2 ビスチェヒット
    BUST_SOFT_NORMAL: 3000,            // パージ後バストヒット（通常）
    BUST_SOFT_FEVER: 6000,             // パージ後バストヒット（Fever中）
    CORE_HIT: 12000,                   // Phase 3 ペンダントコアヒット
    BUSTIER_PURGE: 45000               // ビスチェパージ達成（Phase 3解放）
  },

  // Stage 4: 電脳夜桜カスミ
  stage4: {
    LANTERN_LIT_NEW: 5000,             // 提灯の新規点灯
    LANTERN_LIT_REPEAT: 1800,          // 点灯済み提灯への再ヒット
    YOZAKURA_FULL_BLOOM: 45000,        // 5提灯全点灯・夜桜乱舞コンボ
    SKILL_DMG_P1_PART: 18000,          // パリィ/風魔スラッシュ命中（P1部位）
    SKILL_DMG_P2_SUIT: 22000,          // パリィ/風魔スラッシュ命中（P2装束）
    SKILL_DMG_P3_CLONE: 16000,         // パリィ/風魔スラッシュ命中（P3分身）
    SKILL_DMG_P3_CORE: 28000,          // パリィ/風魔スラッシュ命中（P3コア）
    PHASE1_CLEAR: 40000,               // Phase 1 全4部位破壊ボーナス
    SUIT_PURGE: 60000,                 // Phase 2 忍装束パージボーナス
    STAGE_CLEAR: 160000,               // Stage 4 撃破クリア点
    SKYWAY_ENTRY: 5500,                // 3Dワイヤーランプ進入
    SPINNER_HIT: 2500,                 // 手裏剣スピナー通過初撃
    SPINNER_TICK: 450,                 // 手裏剣スピナー継続回転ティック
    SHURIKEN_CLASH: 3500,              // 投擲手裏剣のボール相殺
    SHURIKEN_PARRY: 9000,              // 投擲手裏剣のフリッパーパリィ
    BUNSHIN_HIT: 4500,                 // 幻影分身ヒット
    BUNSHIN_SHATTER: 20000,            // 幻影分身撃破
    FUMA_BLOCK: 3500,                  // 夜桜風魔大車輪ブロック
    ARMOR_PART_HIT: 3500,              // Phase 1 コテ・膝ヒット
    ARMOR_PART_BREAK: 22000,           // Phase 1 コテ・膝破壊
    SUIT_SEALED: 2000,                 // Phase 1 封印中の忍装束
    SUIT_HIT: 5000,                    // Phase 2 忍装束ヒット
    BUST_SOFT_BOUNCE: 6500,            // Phase 3 パージ後バストバウンス
    WAIST_SENSOR: 3500,                // 腰回路センサー通過
    CORE_HIT: 9000,                    // Phase 3 チャクラ核ヒット
    CORE_BARRIER: 2200,                // 結界中のチャクラ核ヒット
    HAIRPIN_CRIT: 18000,               // 頭頂水引クリティカル（2ダメージ）
    HAIRPIN_BONUS: 4200                // 未開放・結界中の頭頂水引ボーナス
  },

  // Stage 5: 電脳天界サンクチュアリ（エル＆ノエル ➔ 熾天使セラフィア）
  stage5: {
    NUDGE_SAVE: 15000,                 // へそ排出中の台揺らし救出
    SKILL_DMG_TWIN_PART: 12000,        // パリィ命中（双子装備）
    SKILL_DMG_BROOCH: 15000,           // パリィ命中（双子ブローチ）
    SKILL_DMG_SERAPH_ARMOR: 20000,     // パリィ/オルガン命中（3A胸部装甲）
    SKILL_DMG_ORB: 15000,              // パリィ/オルガン命中（3B精霊オーブ）
    SKILL_DMG_CORE: 25000,             // パリィ/オルガン命中（3Bアークコア）
    TWIN_SOLO_BREAK: 25000,            // エルまたはノエル単独ブレイク
    BOTH_TWINS_BROKEN: 40000,          // 双子両方ブレイク達成
    SERAPHIA_AWAKENING: 80000,         // 超次元合体・セラフィア降臨
    SERAPHIA_ARMOR_PURGE: 100000,      // セラフィア胸部装甲パージ
    STAGE_CLEAR: 200000,               // Stage 5 最終撃破クリア点
    RAMP_ENTRY: 6000,                  // NOEL/ELLE RAMP 進入
    SWORD_CLASH: 4000,                 // 光剣のボール相殺
    SWORD_PARRY: 12000,                // 光剣のフリッパーパリィ
    SINGULARITY_SLING: 4500,           // ブラックホール特異点スリング
    HALO_RING_CLASH: 3500,             // 審判の光輪のボール相殺
    HALO_RING_PARRY: 10000,            // 審判の光輪のフリッパーパリィ
    GAMMA_BURST_HIT: 3000,             // ガンマ線バースト反射
    NAVEL_BEAM_REFLECT: 1800,          // へそ間ワンウェイビーム反射
    NAVEL_OVERLOAD: 5000,              // へそ3回反射によるブローチ過負荷
    TWIN_TOSS: 4000,                   // 中央ハイファイブTWIN TOSS
    TWIN_PART_HIT: 5000,               // 双子装備ヒット（通常）
    TWIN_PART_SYNCHRO: 12000,          // 双子装備ヒット（左右交互2倍）
    GARTER_CHARM: 4500,                // 双子太ももガーターチャーム
    BROOCH_GUARD: 3000,                // ロック中の胸ブローチ
    BROOCH_HIT: 8000,                  // 露出後の胸ブローチヒット
    CHIME_PIPE_HIT: 4000,              // パイプオルガン単体ヒット
    HARMONY_JACKPOT: 40000,            // 5パイプ全点灯ハーモニージャックポット
    CROSS_LASER_DEFLECT: 3000,         // 回転十字レーザー反射
    SERAPH_CHEST_HIT: 6000,            // Phase 3A セラフィア胸装甲ヒット
    SERAPH_PAULDRON_HIT: 4000,         // Phase 3A セラフィア肩装甲ヒット
    ORB_HIT: 4500,                     // 精霊オーブヒット
    ORB_SHATTER: 18000,                // 精霊オーブ撃破
    CORE_BARRIER: 2000,                // 結界中のアークコアヒット
    CORE_HIT: 15000,                   // 露出中のアークコアヒット
    DIVINE_BUST_BOUNCE: 7500,          // Phase 3B パージ後バストバウンス
    SERAPH_GARTER: 4000,               // Phase 3B ガーターバウンス
    SERAPH_NAVEL: 5500                 // Phase 3B へそタッチバウンス
  }
};
