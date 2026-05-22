export const echoExampleScenes = [
  {
    id: "withdrawal-soft",
    scene: "想躲 / 退后",
    families: ["boundary", "feeling", "need", "custom"],
    vectors: ["withdrawal", "vulnerability", "waiting", "distance"],
    keywords: ["躲", "退", "藏", "不想", "三分钟", "空间", "角落"],
    energyRange: [0.1, 0.58],
    examples: [
      {
        selectedFragments: ["想躲一下", "给自己三分钟"],
        echoLines: [
          "你留下了「想躲一下」和「给自己三分钟」。",
          "它们像是在说：先不要太快被看见。",
          "也许此刻等着的，是一个不用马上解释的地方。",
        ],
      },
      {
        selectedFragments: ["不必解释", "保留距离"],
        echoLines: [
          "你把「不必解释」和「保留距离」放在了一起。",
          "这里像是有一小块只属于自己的安静。",
          "也许它正在等一个可以不用立刻回应的空间。",
        ],
      },
    ],
  },
  {
    id: "unclear-fog",
    scene: "模糊 / 没答案",
    families: ["related", "feeling"],
    vectors: ["uncertainty", "wandering", "stillness", "waiting"],
    keywords: ["模糊", "不确定", "没答案", "雾", "乱", "还没"],
    energyRange: [0.12, 0.66],
    examples: [
      {
        selectedFragments: ["还没想好", "没答案"],
        echoLines: [
          "你留下了「还没想好」和「没答案」。",
          "它们像一片还没有散开的雾，不急着变成清楚的路。",
          "也许此刻需要的，只是允许这份不确定先待一会儿。",
        ],
      },
    ],
  },
  {
    id: "seen-soft",
    scene: "靠近 / 被看见",
    families: ["relation", "need", "body"],
    vectors: ["contact", "longing", "openness", "vulnerability"],
    keywords: ["靠近", "被看见", "抱", "陪", "支持", "柔软"],
    energyRange: [0.18, 0.78],
    examples: [
      {
        selectedFragments: ["想被抱住", "被看见一点"],
        echoLines: [
          "你留下了「想被抱住」和「被看见一点」。",
          "它们像是一种很小声的靠近，不一定要说得完整。",
          "也许这里等着的，是一点不用证明自己的陪伴。",
        ],
      },
    ],
  },
  {
    id: "boundary-protect",
    scene: "边界 / 保护",
    families: ["boundary", "relation"],
    vectors: ["constraint", "tension", "quiet-assessment", "distance"],
    keywords: ["边界", "保护", "距离", "危险", "控制", "束缚"],
    energyRange: [0.22, 0.82],
    examples: [
      {
        selectedFragments: ["照顾边界", "离远一点"],
        echoLines: [
          "你留下了「照顾边界」和「离远一点」。",
          "它们像是在给自己留出一个可以呼吸的位置。",
          "也许此刻等着的，是先确认哪里对你来说足够安全。",
        ],
      },
    ],
  },
  {
    id: "tired-rest",
    scene: "疲惫 / 停下",
    families: ["feeling", "body", "need"],
    vectors: ["exhaustion", "stillness", "surrender-to-rest", "withdrawal"],
    keywords: ["累", "疲", "困", "停", "休息", "沉"],
    energyRange: [0.05, 0.45],
    examples: [
      {
        selectedFragments: ["很累", "慢一点"],
        echoLines: [
          "你留下了「很累」和「慢一点」。",
          "它们像是身体先替你把速度放低了。",
          "也许此刻等着的，不是振作，而是被允许停下。",
        ],
      },
    ],
  },
];
