import {
    BedrockRuntimeClient,
    InvokeModelCommand
} from '@aws-sdk/client-bedrock-runtime'

const client = new BedrockRuntimeClient({ region: 'us-east-1' })

/**
 * Tools
 */
function getTime() {
    var date = new Date()
    var hour = date.getHours()
    return (hour < 10 ? '0' : '') + hour
}

function getSchedule(hour) {
    if (hour < 10) {
        return 'workout'
    }
    if (hour < 13) {
        return 'lunch'
    }
    if (hour < 23) {
        return 'important meeting'
    }
}

function getTraffic(hour) {
    if (hour < 10) {
        return 'traffic is bad'
    }
    if (hour < 13) {
        return 'traffic is good'
    }
    if (hour < 23) {
        return 'traffic is bad'
    }
}

const tools = {
    getSchedule,
    getTraffic
}

const isFast = true
export async function internalPrompt({
    prompt,
    temperature = 1,
    maxTokens = 300,
    topK = 250,
    topP = 0.999
}) {
    const scheduleTool = `You have access to the “getSchedule” function. You can call this at any time by writing “<function_call>getSchedule(number)</function_call>. This will trigger a function that will returns the next task in the day.

Example:

H: What is my next event?

A: <function_call>getSchedule(9)</function_call>
<function_result>Workout</function_result>
<answer>Workout</answer>`

    const trafficTool = `You have access to the “getTraffic” function to help you answer questions about traffic. Do not answer questions about traffic without calling this function. You can call this at any time by writing “<function_call>getTraffic(number)</function_call>. This will trigger a function that will returns a description of how traffic is at that time.

Example:

H: How is the traffic?

A: <function_call>getTraffic(9)</function_call>
<function_result>traffic is good</function_result>
<answer>traffic is good</answer>`

    const promptTemplate = `

Human: The current time of day is ${getTime()}.

${scheduleTool}
${trafficTool}

You are a personal assistant. Only answer if you are certain. Use functions to help answer questions. Do not mention functions in your final response.

${prompt}

Assistant:`

    const promptParams = {
        prompt: promptTemplate,
        max_tokens_to_sample: maxTokens,
        temperature,
        top_k: topK,
        top_p: topP,
        anthropic_version: 'bedrock-2023-05-31',
        stop_sequences: ['</function_call>']
    }

    const params = {
        modelId: isFast ? 'anthropic.claude-instant-v1' : 'anthropic.claude-v2',
        contentType: 'application/json',
        accept: '*/*',
        body: JSON.stringify(promptParams)
    }

    const command = new InvokeModelCommand(params)
    const data = await client.send(command)
    const asciiDecoder = new TextDecoder('ascii')
    const res = asciiDecoder.decode(data.body)
    return {
        originalPrompt: promptTemplate,
        completion: JSON.parse(res).completion
    }
}

async function continueCall(prompt) {
    var temperature = 1,
        maxTokens = 300,
        topK = 250,
        topP = 0.999

    const promptParams = {
        prompt: prompt,
        max_tokens_to_sample: maxTokens,
        temperature,
        top_k: topK,
        top_p: topP,
        anthropic_version: 'bedrock-2023-05-31',
        stop_sequences: ['</function_call>']
    }

    const params = {
        modelId: isFast ? 'anthropic.claude-instant-v1' : 'anthropic.claude-v2',
        contentType: 'application/json',
        accept: '*/*',
        body: JSON.stringify(promptParams)
    }

    const command = new InvokeModelCommand(params)
    const data = await client.send(command)
    const asciiDecoder = new TextDecoder('ascii')
    const res = asciiDecoder.decode(data.body)
    return JSON.parse(res).completion
}

export async function functioncalling(question) {
    const { originalPrompt, completion } = await internalPrompt(question)
    const firstTry = originalPrompt + completion

    let isComplete = false
    let tries = 0
    let fullPrompt = firstTry

    while (!isComplete || tries < 4) {
        if (fullPrompt.endsWith(')')) {
            // get function and params
            const split = fullPrompt.split('<function_call>')
            const length = split.length
            const chunk = split[length - 1]
            const fnName = chunk.split('(')[0]
            const number = chunk.split('(')[1].split(')')[0]
            // call function
            const result = tools[fnName](Number(number))
            // create new prompt
            const newPrompt =
                fullPrompt +
                `</function_call><function_result>${result}</function_result>`
            const updatedResponse = await continueCall(newPrompt)
            fullPrompt = newPrompt + updatedResponse
        } else {
            isComplete = true
        }
        tries++
    }

    console.log(fullPrompt)
    if (fullPrompt.endsWith('</answer>')) {
        const split = fullPrompt.split('<answer>')
        return split[split.length - 1].split('</answer>')[0]
    } else {
        const split = fullPrompt.split('</function_result>')
        return split[split.length - 1]
    }
}
