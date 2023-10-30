import express from 'express'
import bodyParser from 'body-parser'
import fs from 'fs'
import { ai } from './ai.mjs'
import { functioncalling } from './prompts/functioncall.mjs'
import cors from 'cors'

const app = express()
const port = 3001
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cors())

app.get('/', (_, res) => {
    const html = fs.readFileSync('./frontend/general.html', {
        encoding: 'utf-8'
    })
    res.send(html)
})

app.get('/code', (_, res) => {
    const html = fs.readFileSync('./frontend/code.html', {
        encoding: 'utf-8'
    })
    res.send(html)
})

app.get('/assistant', (_, res) => {
    const html = fs.readFileSync('./frontend/calling.html', {
        encoding: 'utf-8'
    })
    res.send(html)
})

let session = []
app.post('/api/ask', async (req, res) => {
    const data = req.body.data
    if (data === 'clear') { 
        session = []
        res.json({
            result: ''
        })
        return
    }

    const before = session.length > 2 
        ? session.slice(-3) 
        : session.slice(0);
    
    
    const prompt = before.join('') + `

Human: ${data}


Assistant:`
    const result = await ai({
        prompt
    })

    session = session + prompt + result.completion 
    res.json({
        result: result.completion
    })
})

app.post('/api/functioncalling', async (req, res) => {
    const data = req.body.data

    const result = await functioncalling({
        prompt: data
    })
    res.json({
        result: result
    })
})

app.listen(port, () => {
    console.log(`listening on port ${port}`)
})
