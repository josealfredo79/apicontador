#!/bin/bash
cd /home/josealfredo/api-contador
node index.js > /tmp/api.log 2>&1 &
echo "Servidor iniciado en background"