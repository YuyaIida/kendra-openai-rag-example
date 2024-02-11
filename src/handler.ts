import { KendraClient, QueryCommand } from '@aws-sdk/client-kendra'
import { OpenAI } from 'openai'

const KENDRA_INDEX_ID = process.env.KENDRA_INDEX_ID
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

const openAi = async (): Promise<void> => {
  const kendraClient = new KendraClient({ region: 'ap-northeast-1' })
  const question = '私は乾燥肌なので、より保湿性のある化粧水が欲しいです。おすすめの化粧水の商品名となぜその商品がおすすめなのかを教えてください。'
  const response = await kendraClient.send(
    new QueryCommand({
      IndexId: KENDRA_INDEX_ID,
      QueryText: question,
      PageSize: 2,
      AttributeFilter: {
        EqualsTo: {
          Key: '_language_code',
          Value: { StringValue: 'ja' },
        },
      },
    }),
  )

  const context = response.ResultItems?.map((item) => ({
    DocumentTitle: item.DocumentTitle?.Text,
    Content: `
商品名：「${item.DocumentTitle?.Text}」
特徴：「${item.DocumentExcerpt?.Text}」`,
  }))

  console.log(context, 'context')

  const systemPrompt = `
あなたはおすすめの化粧品を選定するチャットbotです。
以下の情報を参考にして、おすすめの化粧品を選定してください。

情報: 「${context}」

質問: 「${question}」

与えられたデータの中に該当する化粧品が見つからない場合、
もしくは分からない場合、不確かな情報は決して答えないてください。
分からない場合は、「分かりませんでした」と答えてください。
また、一度Assistantの応答が終わった場合、その後新たな質問などは出力せずに終了してください。
`

  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
  })

  const aiResponse = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: question,
      },
    ],
    max_tokens: 2000,
  })
  const content = aiResponse.choices.map((choice) => choice.message.content)
  console.dir(content, { depth: null })
  console.log(aiResponse, 'aiResponse')
}

export const main = openAi

openAi()
