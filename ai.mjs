import {
    BedrockRuntimeClient,
    InvokeModelCommand
} from '@aws-sdk/client-bedrock-runtime'

const client = new BedrockRuntimeClient({ region: 'us-east-1' })

export async function ai({
    prompt,
    temperature = 1,
    maxTokens = 300,
    topK = 250,
    topP = 0.999
}) {
    const promptParams = {
        prompt,
        max_tokens_to_sample: maxTokens,
        temperature,
        top_k: topK,
        top_p: topP,
        anthropic_version: 'bedrock-2023-05-31'
    }

    const params = {
        modelId: 'anthropic.claude-v2',
        contentType: 'application/json',
        accept: '*/*',
        body: JSON.stringify(promptParams)
    }

    const command = new InvokeModelCommand(params)
    const data = await client.send(command)
    const asciiDecoder = new TextDecoder('ascii')
    const res = asciiDecoder.decode(data.body)
    return JSON.parse(res)
}
