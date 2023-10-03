import express from 'express'
import bodyParser from 'body-parser'
import fs from 'fs'
import { ai } from './ai.mjs'
import cors from 'cors'

const app = express()
const port = 3001
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cors())

app.get('/', (_, res) => {
    const html = fs.readFileSync('./frontend/index.html', {
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

app.post('/api/ask', async (req, res) => {
    const data = req.body.data
    const prompt = `Human: ${data}
Assistant:`
    const result = await ai({
        prompt
    })
    res.json({
        result: result.completion
    })
})

app.listen(port, () => {
    console.log(`listening on port ${port}`)
})
