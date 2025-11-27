export const translations = {
  en: {
    header: {
      title: 'Morse Code',
      subtitle: 'Web Tool'
    },
    hero: {
      title: 'Morse Code Translator',
      subtitle: 'Simple. Elegant. Communication.'
    },
    tabs: {
      encode: 'Text to Morse',
      decode: 'Morse to Text'
    },
    input: {
      encodePlaceholder: 'Type text here...', 
      decodePlaceholder: 'Type Morse code here...'
    },
    output: {
      title: 'Translation Result',
      empty: 'Wait for input...', 
      copied: 'Copied'
    },
    controls: {
      play: 'Play Audio',
      playing: 'Playing',
      stop: 'Stop',
      clear: 'Clear'
    },
    footer: {
      note: 'Note: Characters not in the dictionary will be shown as \'#\'.',
      copyright: '© 2025 Morse Code Translator. Created by mtmtspace.'
    },
        help: {
          title: 'Supported Characters',
          en: 'English / Latin (A-Z)',
          num: 'Numbers (0-9)',
          cn: 'Chinese (Standard Telegraph Code)',
          jp: 'Japanese (Katakana)',
          kr: 'Korean (Hangul)',
          th: 'Thai',
          ru: 'Cyrillic (Russian)',
          gr: 'Greek',
          he: 'Hebrew',
          ar: 'Arabic',
          pe: 'Persian',
          lat: 'Latin Extended',
          sym: 'Symbols (.,?/@-)',
          close: 'Close'
        }
      },
      cn: {
        header: {
          title: '摩尔斯电码',
          subtitle: '在线工具'
        },
        hero: {
          title: '摩尔斯电码翻译器',
          subtitle: '简单 · 优雅 · 沟通'
        },
        tabs: {
          encode: '文本转电码',
          decode: '电码转文本'
        },
        input: {
          encodePlaceholder: '在此输入文本...',
          decodePlaceholder: '在此输入摩尔斯电码...'
        },
        output: {
          title: '翻译结果',
          empty: '等待输入...',
          copied: '已复制'
        },
        controls: {
          play: '播放音频',
          playing: '播放中',
          stop: '停止',
          clear: '清空'
        },
        footer: {
          note: '注意：字典中不存在的字符将显示为 \'#\'.',
          copyright: '© 2025 摩尔斯电码翻译器。作者 mtmtspace。'
        },
        help: {
          title: '支持字符说明',
          en: '英语 / 拉丁字母 (A-Z)',
          num: '数字 (0-9)',
          cn: '中文 (标准中文电码 CTC)',
          jp: '日语 (片假名)',
          kr: '韩语 (谚文)',
          th: '泰语',
          ru: '西里尔字母 (俄语)',
          gr: '希腊字母',
          he: '希伯来语',
          ar: '阿拉伯语',
          pe: '波斯语',
          lat: '拉丁语扩展',
          sym: '标点符号 (.,?/@-)',
          close: '关闭'
        }
      }
    };
export type Language = 'en' | 'cn';