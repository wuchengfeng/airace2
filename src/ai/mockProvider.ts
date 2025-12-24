import type { AiProvider } from './types'

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

export const mockAiProvider: AiProvider = {
  async generateSentence(input) {
    await delay(250)
    return {
      sentence: `In the middle of the discussion, she casually mentioned "${input.term}" and everyone nodded.`,
      sentenceZh: `在讨论的过程中，她随口提到 “${input.term}”，大家都点头。`,
    }
  },
  async translateSentenceZh(input) {
    await delay(150)
    return {
      sentenceZh: input.sentence.replace(new RegExp(input.term, 'gi'), `“${input.term}”`).replace(
        /./,
        '',
      ) ? `（演示）请将英文句子翻译为中文，并保持术语 “${input.term}” 不翻译：${input.sentence}` : `（演示）${input.sentence}`,
    }
  },
  async judgeMeaning(input) {
    await delay(250)
    const normalized = input.userMeaningZh.trim()
    const isCorrect = normalized.length > 0 && /对|正确|意思是|=/.test(normalized)
    return {
      isCorrect,
      score: isCorrect ? 90 : 55,
      confidence: isCorrect ? 0.75 : 0.4,
      reason: isCorrect ? '覆盖到关键语义' : '还没有贴近这句话的语境',
    }
  },
  async generateContext(input) {
    await delay(350)
    return {
      prevSentence: `Before that, the speaker sets up the scene so "${input.term}" makes sense.`,
      nextSentence: `Afterwards, the sentence clarifies the consequence related to "${input.term}".`,
      explanationZh: '这两句是在帮你把原句的逻辑补全，重点看因果/转折关系。',
    }
  },
  async generateArticle(input) {
    await delay(450)
    const articleEn = [
      `I was reading quietly when I noticed something odd.`,
      input.sentence,
      `At that moment, the meaning became clearer through the surrounding details.`,
      `The story continues with a small twist and a simple conclusion.`,
    ].join(' ')
    return {
      articleEn,
      sentenceExplanationEn: `In this sentence, "${input.term}" carries a context-specific meaning that fits the story flow.`,
    }
  },
  async finalReveal(input) {
    await delay(350)
    return {
      articleZh:
        '这是一段围绕目标句展开的短文。通过前后信息，你可以推断出句子里的关键词在此处表达了更具体的语义，而不是它最常见的泛义。',
      termMeaningZh: `（在此句语境下）"${input.term}" 的含义`,
    }
  },
}
