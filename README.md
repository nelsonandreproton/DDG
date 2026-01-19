# 🦆 DuckDuckGo Search MCP Server

Servidor MCP para pesquisas web usando DuckDuckGo - **sem necessidade de API keys!**

## ✨ Características

- 🔍 **Pesquisa web completa** usando DuckDuckGo
- 🆓 **100% gratuito** - sem API keys necessárias
- 🚀 **Pronto para Render** - deploy em 5 minutos
- 📋 **Formato markdown** - resultados bem formatados
- 🔧 **Compatível com ODC** - funciona via URL HTTP

## 🚀 Deploy Rápido no Render

### 1. Preparação

Cria um novo repositório GitHub com estes ficheiros:
- `package.json`
- `server.js`
- `.gitignore`
- `README.md`

### 2. Deploy no Render

1. Vai a [render.com](https://render.com)
2. **New +** → **Web Service**
3. Conecta o teu repositório GitHub
4. Configuração:
   - **Name**: `duckduckgo-search-mcp` (ou outro nome)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: **Free** ✅

5. Clica **Create Web Service**
6. Aguarda 2-3 minutos

### 3. Obter o URL

Quando o deploy terminar, terás um URL tipo:
```
https://duckduckgo-search-mcp.onrender.com
```

## 🔧 Configuração no OutSystems ODC

### URL do Servidor:
```
https://SEU-APP.onrender.com/mcp
```

### Transport Type:
```
http
```
(ou `streamable-http` se o ODC tiver essa opção)

### Exemplo de Configuração JSON:
```json
{
  "type": "url",
  "url": "https://duckduckgo-search-mcp.onrender.com/mcp",
  "transport": "http",
  "name": "duckduckgo-search"
}
```

## 🧪 Testar ANTES de Configurar

### 1. Health Check
```bash
curl https://SEU-APP.onrender.com/health
```

✅ Resposta esperada:
```json
{
  "status": "ok",
  "timestamp": "2025-01-19T..."
}
```

### 2. Test Initialize
```bash
curl -X POST https://SEU-APP.onrender.com/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {}
  }'
```

### 3. Test Tools List
```bash
curl -X POST https://SEU-APP.onrender.com/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }'
```

### 4. Test Search
```bash
curl -X POST https://SEU-APP.onrender.com/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "search_web",
      "arguments": {
        "query": "OutSystems ODC",
        "max_results": 3
      }
    }
  }'
```

## 📋 Tool Disponível: `search_web`

### Parâmetros:

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `query` | string | ✅ Sim | Query de pesquisa |
| `max_results` | number | ❌ Não | Número máximo de resultados (1-10, default: 5) |

### Exemplos de Uso no ODC:

```
"Search the web for the latest news about AI"
```

```
"Find information about OutSystems best practices"
```

```
"Search for Python tutorials for beginners"
```

O AI vai automaticamente usar o tool `search_web` e retornar os resultados formatados!

## 📊 Formato dos Resultados

Os resultados são retornados em markdown formatado:

```markdown
# Search Results for "your query"

Found 5 result(s):

## 1. Title of First Result

**URL:** https://example.com

Brief snippet of the content...

---

## 2. Title of Second Result

**URL:** https://example2.com

Another snippet...

---
```

## ⚠️ Notas Importantes

### Plano Free do Render:
- ✅ **Grátis para sempre**
- ⚠️ **Dorme após 15 min** de inatividade
- ⏱️ **Cold start**: ~30-50s no primeiro request
- 💡 **Solução**: Faz ping ao `/health` de 10 em 10 minutos

### Rate Limiting:
- DuckDuckGo pode limitar requests muito frequentes
- Recomendado: **não mais que 1-2 requests por segundo**
- Se ficares bloqueado, aguarda alguns minutos

### Qualidade dos Resultados:
- DuckDuckGo não tem API oficial
- Parsing é feito via HTML (pode quebrar se mudarem o layout)
- Funciona bem na maioria dos casos

## 🐛 Troubleshooting

### Timeout no ODC

**Causa**: Serviço está a dormir (cold start)

**Solução**:
```bash
# 1. Acorda o serviço
curl https://SEU-APP.onrender.com/health

# 2. Aguarda 30-60 segundos

# 3. Tenta no ODC novamente
```

### Sem Resultados

**Causas possíveis**:
- Query muito específica
- DuckDuckGo bloqueou temporariamente
- Problema de parsing HTML

**Solução**:
- Tenta queries diferentes
- Verifica os logs no Render
- Aguarda alguns minutos se suspeitas de rate limit

### Erro de Conexão

**Verifica**:
1. Serviço está running no Render?
2. URL está correto? (deve terminar em `/mcp`)
3. Transport type está como `http`?

## 🔍 Ver Logs no Render

1. Render Dashboard → Teu serviço
2. Clica em **"Logs"**
3. Procura por:
   - `=== MCP REQUEST ===` - pedidos recebidos
   - `Searching DuckDuckGo` - pesquisas executadas
   - `Found X results` - resultados encontrados
   - `ERROR` - erros

## 🎯 Casos de Uso

### Pesquisa Geral
```
"What are the top programming languages in 2025?"
```

### Notícias
```
"Find recent news about artificial intelligence"
```

### Tutoriais
```
"Search for React hooks tutorial"
```

### Comparações
```
"Compare OutSystems vs traditional development"
```

## 📈 Melhorias Futuras Possíveis

- [ ] Cache de resultados
- [ ] Filtros por data
- [ ] Pesquisa por domínio específico
- [ ] Suporte para pesquisa de imagens
- [ ] Rate limiting inteligente

## 🆘 Suporte

Se tiveres problemas:

1. **Verifica os logs** no Render Dashboard
2. **Testa manualmente** com curl
3. **Confirma a configuração** no ODC
4. **Aguarda cold start** (primeira vez pode demorar)

## 📝 Licença

Livre para uso pessoal e comercial!

---

**Criado para OutSystems ODC** 🚀
**Powered by DuckDuckGo** 🦆
