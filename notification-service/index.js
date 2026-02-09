const express = require('express')
require('dotenv').config()
const cors = require('cors')
const app = express()

app.use(cors())
app.use(express.json())

const notificationRoutes = require('./routes/mail.routes.js')

app.use('/notify', notificationRoutes)

// Health check para Kubernetes
app.get('/health', (_req, res) => res.json({ status: 'ok' }))

const PORT = process.env.PORT || 5002
app.listen(PORT, () => {
    console.log(`✅ Notification Service escuchando en el puerto ${PORT}`)
})