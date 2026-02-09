require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth.routes');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/api', authRoutes);

// Health check para Kubernetes
app.get('/health', (_req, res) => {
    const state = mongoose.connection.readyState;
    if (state === 1) res.json({ status: 'ok' });
    else res.status(503).json({ status: 'error', db: state });
});

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log('🚀 Conectado a MongoDB');
        app.listen(PORT, '0.0.0.0', () => console.log(`✅ Servidor escuchando en puerto ${PORT}`));
    })
    .catch(err => console.error('❌ Error al conectar a MongoDB:', err));
