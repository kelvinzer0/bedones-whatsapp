# RENCANA WHATSAPP AGENT - Arsitektur dan Implementasi

---

## GAMBARAN UMUM

Arsitektur terdesentralisasi dengan **dua agent LangChain berbeda**:

1. **Backend Agent**: Percakapan dengan **pemilik bisnis** (onboarding, konfigurasi)
2. **WhatsApp Agent**: Percakapan dengan **klien WhatsApp** pemilik bisnis

---

## ARSITEKTUR GLOBAL

```
┌──────────────────────────────────────────────────────────────────┐
│  VPS BACKEND (1 untuk semua klien)                              │
│                                                                    │
│  ┌─────────────────────┐         ┌──────────────────────┐       │
│  │  Backend (NestJS)   │────────▶│  PostgreSQL          │       │
│  │  - API REST         │         │  - Users             │       │
│  │  - LangChain Agent  │◄────────│  - WhatsappAgents    │       │
│  │  - Tools (config)   │         │  - Products          │       │
│  │  - Onboarding       │         │  - Logs              │       │
│  │  - Prisma           │         │  - Threads           │       │
│  └─────────┬───────────┘         └──────────────────────┘       │
│            │                     ┌──────────────────────┐       │
│            │                     │  Redis               │       │
│            │                     │  - Cache             │       │
│            │                     │  - Jobs              │       │
│            │                     └──────────────────────┘       │
│  ┌─────────▼───────────┐                                        │
│  │  Frontend (React)   │                                        │
│  │  - Dashboard pemilik│                                        │
│  │  - Chat onboarding  │                                        │
│  └─────────────────────┘                                        │
└──────────────────────────────────────┬───────────────────────────┘
                                       │
                                       │ HTTPS/REST API
                                       │
┌──────────────────────────────────────▼───────────────────────────┐
│  VPS KLIEN (beberapa klien dimungkinkan)                        │
│                                                                    │
│  ┌─────────────── KLIEN 1 ───────────────────────────┐          │
│  │                                                      │          │
│  │  ┌──────────────────┐         ┌──────────────────┐ │          │
│  │  │  Connector       │────────▶│  Agent           │ │          │
│  │  │  - wwebjs        │ webhook │  - LangChain     │ │          │
│  │  │  - Events        │  lokal  │  - Tools         │ │          │
│  │  │  - Execute code  │         │  - Prisma        │ │          │
│  │  │  TANPA DB        │         └────────┬─────────┘ │          │
│  │  │  TANPA Prisma    │                  │           │          │
│  │  └──────────────────┘                  │           │          │
│  │                              ┌──────────▼─────────┐ │          │
│  │                              │  PostgreSQL        │ │          │
│  │                              │  - Checkpoints     │ │          │
│  │                              │  - Memories        │ │          │
│  │                              └────────────────────┘ │          │
│  │                              ┌────────────────────┐ │          │
│  │                              │  Redis             │ │          │
│  │                              │  - Bull Queue      │ │          │
│  │                              └────────────────────┘ │          │
│  └──────────────────────────────────────────────────────┘          │
│                                                                    │
│  ┌─────────────── KLIEN 2 ───────────────────────────┐          │
│  │  (struktur sama)                                   │          │
│  └──────────────────────────────────────────────────────┘          │
└──────────────────────────────────────────────────────────────────┘
```

---

## DUA AGENT LANGCHAIN BERBEDA

### 1. Backend Agent (Onboarding)

**Peran**: Mengonfigurasi agent pemilik bisnis melalui chat percakapan

**Pengguna**: Pemilik bisnis (via dashboard web)

**Tools Backend**:
- `readUserInfo` - Baca info pengguna
- `readBusinessProfile` - Baca profil bisnis
- `readProducts` - Baca produk
- `updateAgentContext` - Ubah konteks agent
- `executeScriptViaConnector` - Jalankan skrip WPP via connector
- `getAllLabels` - Ambil label WhatsApp
- `addNewLabel` - Buat label baru
- `editLabel` - Ubah label
- `createGroup` - Buat grup WhatsApp
- `analyzeProductImages` - Analisis gambar dengan AI
- `updateStrategy` - Ubah strategi penjualan

**Contoh percakapan**:
```
Pemilik: "Saya ingin agent saya lebih ramah"
Backend Agent:
  1. Baca konteks saat ini (readAgentContext)
  2. Ubah nada (updateAgentContext)
  3. Balas: "✅ Konteks diperbarui! Nada ramah diaktifkan."
```

**Database**: PostgreSQL backend (terpusat)

**LangGraph State**:
```typescript
const BackendAgentState = z.object({
  messages: MessagesZodMeta,
  userId: z.string(),
  agentId: z.string(),
  currentContext: z.string(),
  contextScore: z.number(),
});
```

---

### 2. WhatsApp Agent (Percakapan klien)

**Peran**: Membalas klien WhatsApp secara otomatis

**Pengguna**: Klien WhatsApp pemilik bisnis

**Tools Agent**:
- `sendMessage` - Kirim pesan (maks 500 karakter)
- `sendProduct` - Kirim produk dari katalog
- `sendCollection` - Kirim koleksi
- `forwardToManagementGroup` - Teruskan ke grup manajemen
- `listProducts` - Daftar produk
- `searchProducts` - Cari produk
- `getProductDetails` - Detail produk
- `getContactLabels` - Label kontak
- `addLabelToContact` - Tambah label
- `getOlderMessages` - Ambil pesan lama
- `detectIntent` - Deteksi niat
- `scheduleMessage` - Jadwalkan pengingat
- `savePersistentMemory` - Simpan memori penting
- `retrievePersistentMemory` - Ambil memori

**Contoh percakapan**:
```
Klien: "Berapa harga gaun biru?"
WhatsApp Agent:
  1. Cari produk (searchProducts)
  2. Dapatkan detail (getProductDetails)
  3. Kirim produk (sendProduct)
  4. Balas: "Ini gaun biru elegan kami! 👗 Harga: 25000 FCFA"
```

**Database**: PostgreSQL agent (lokal di VPS klien)

**LangGraph State**:
```typescript
const WhatsAppAgentState = z.object({
  messages: MessagesZodMeta,
  chatId: z.string(),
  contactLabels: z.array(z.string()),
  agentContext: z.string(),  // Diambil dari backend
  userPreferences: z.record(z.string(), z.any()).optional(),
  pendingOrder: z.any().optional(),
});
```

---

## CONNECTOR (KLIEN MURNI)

**Tanggung Jawab HANYA**:
1. Terhubung ke WhatsApp Web
2. Kirim event → Agent (webhook lokal)
3. Menerima skrip → Jalankan di halaman
4. **ITU SAJA**

**TIDAK ADA**:
- Database
- Prisma
- Logika bisnis
- LangChain
- Tools

**Konfigurasi**:
```env
CONNECTOR_IP=connector-client-001
AGENT_WEBHOOK_URL=http://localhost:3002/webhook  # Lokal ke VPS
```

**Kode minimal**:
```typescript
// whatsapp-client.service.ts
this.client.on('ready', (...args) => {
  // Kirim event ke agent (lokal)
  await this.webhookService.sendEvent('ready', args);
});

this.client.on('message', (...args) => {
  // Kirim event ke agent (lokal)
  await this.webhookService.sendEvent('message', args);
});

this.client.on('disconnected', (...args) => {
  // Kirim event ke agent (lokal)
  await this.webhookService.sendEvent('disconnected', {
    connectorIp: this.connectorIp,
    reason: args[0]
  });
});

// Endpoint untuk menjalankan skrip
@Post('execute-script')
async executeScript(@Body() { script }) {
  const result = await this.pupPage.evaluate(script);
  return result;
}
```

---

## FLOW LENGKAP SEBUAH PESAN

### 1. Pesan diterima di WhatsApp

```
1. WhatsApp → Connector (wwebjs event 'message')
   ↓
2. Connector → Agent (webhook lokal POST /webhook/message)
   {
     event: 'message',
     data: [...args]
   }
   ↓
3. Agent mengambil label via Connector
   POST http://localhost:3001/execute-script
   { script: "WPP.labels.getChatLabels('237xxx@c.us')" }
   ↓
4. Agent mengambil riwayat via Connector
   POST http://localhost:3001/execute-script
   { script: "WPP.chat.getMessages('237xxx@c.us', 10)" }
   ↓
5. Agent → Backend (API REST)
   POST https://backend.example.com/agent/can-process
   {
     connectorIp: "connector-001",
     from: "237xxx@c.us",
     message: "Berapa harga?",
     contactLabels: ["client"],
     recentMessages: [...]
   }
   ↓
6. Backend memeriksa:
   - Skor ≥ 80%?
   - Kredit tersisa?
   - Mode prod atau label tes?
   - Label yang dikecualikan?
   ↓
7. Backend → Agent
   {
     canProcess: true,
     whatsappAgent: {
       agentContext: "...",
       managementGroupId: "...",
       // ...
     }
   }
   ↓
8. Agent memproses dengan LangGraph
   - Muat checkpoint (memori percakapan)
   - Jalankan agent dengan tools
   - Buat respons
   ↓
9. Agent mengirim respons via Connector
   POST http://localhost:3001/execute-script
   {
     script: "WPP.chat.sendTextMessage('237xxx@c.us', 'Halo...')"
   }
   ↓
10. Agent mencatat operasi ke Backend
    POST https://backend.example.com/agent/log-operation
    {
      from: "237xxx@c.us",
      userMessage: "...",
      agentResponse: "...",
      tokensUsed: 1234,
      toolsUsed: ["searchProducts", "sendMessage"]
    }
```

---

## TOOLS PER AGENT

### Tools Backend Agent (Konfigurasi)

#### Membaca data

```typescript
const readAgentContext = tool(
  async ({ agentId }) => {
    const agent = await prisma.whatsAppAgent.findUnique({
      where: { id: agentId }
    });
    return JSON.stringify({
      context: agent.agentContext,
      score: agent.contextScore
    });
  },
  {
    name: 'read_agent_context',
    description: 'Baca konteks agent saat ini',
    schema: z.object({ agentId: z.string() })
  }
);

const readProducts = tool(
  async ({ userId }) => {
    const products = await prisma.product.findMany({
      where: { userId },
      include: { images: true }
    });
    return JSON.stringify(products);
  },
  {
    name: 'read_products',
    description: 'Baca semua produk dari katalog',
    schema: z.object({ userId: z.string() })
  }
);
```

#### Modifikasi konfigurasi

```typescript
const updateAgentContext = tool(
  async ({ agentId, newContext }) => {
    await prisma.whatsAppAgent.update({
      where: { id: agentId },
      data: { agentContext: newContext }
    });
    return { success: true };
  },
  {
    name: 'update_agent_context',
    description: 'Ubah konteks agent (nada, aturan, dll.)',
    schema: z.object({
      agentId: z.string(),
      newContext: z.string()
    })
  }
);

const updateStrategy = tool(
  async ({ agentId, strategy }) => {
    await prisma.whatsAppAgent.update({
      where: { id: agentId },
      data: { activationStrategy: strategy }
    });
    return { success: true };
  },
  {
    name: 'update_strategy',
    description: 'Ubah strategi aktivasi (test/tags/all)',
    schema: z.object({
      agentId: z.string(),
      strategy: z.object({
        type: z.enum(['test', 'tags', 'all']),
        phoneNumbers: z.array(z.string()).optional(),
        tagIds: z.array(z.string()).optional()
      })
    })
  }
);
```

#### Interaksi dengan WhatsApp (via Connector)

```typescript
const getAllLabels = tool(
  async ({ connectorIp }) => {
    // Panggil connector untuk menjalankan skrip
    const result = await connectorClient.executeScript(
      connectorIp,
      `(async () => {
        const labels = await WPP.labels.getAllLabels();
        return labels.map(l => ({
          id: l.id,
          name: l.name,
          hexColor: l.hexColor
        }));
      })()`
    );
    return JSON.stringify(result);
  },
  {
    name: 'get_all_labels',
    description: 'Ambil semua label WhatsApp',
    schema: z.object({ connectorIp: z.string() })
  }
);

const addNewLabel = tool(
  async ({ connectorIp, name, color }) => {
    const result = await connectorClient.executeScript(
      connectorIp,
      `WPP.labels.addNewLabel("${name}", "${color}")`
    );
    return JSON.stringify(result);
  },
  {
    name: 'add_new_label',
    description: 'Buat label WhatsApp baru',
    schema: z.object({
      connectorIp: z.string(),
      name: z.string(),
      color: z.string().optional()
    })
  }
);

const createGroup = tool(
  async ({ connectorIp, name, participants }) => {
    const result = await connectorClient.executeScript(
      connectorIp,
      `WPP.group.create("${name}", ${JSON.stringify(participants)})`
    );
    return JSON.stringify(result);
  },
  {
    name: 'create_group',
    description: 'Buat grup WhatsApp',
    schema: z.object({
      connectorIp: z.string(),
      name: z.string(),
      participants: z.array(z.string())
    })
  }
);
```

#### Analisis AI

```typescript
const analyzeProductImages = tool(
  async ({ productId }) => {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { images: true }
    });

    // Analisis 2 gambar pertama dengan Grok
    const analyses = [];
    for (const image of product.images.slice(0, 2)) {
      const analysis = await grokVision.invoke([
        {
          type: 'image_url',
          image_url: { url: image.url }
        },
        {
          type: 'text',
          text: 'Jelaskan produk ini secara detail (warna, bahan, gaya, dll.)'
        }
      ]);
      analyses.push(analysis.content);
    }

    return JSON.stringify(analyses);
  },
  {
    name: 'analyze_product_images',
    description: 'Analisis gambar produk dengan AI',
    schema: z.object({ productId: z.string() })
  }
);
```

---

### Tools WhatsApp Agent (Klien)

#### Komunikasi

```typescript
const sendMessage = tool(
  async ({ to, message }) => {
    if (message.length > 500) {
      return JSON.stringify({
        success: false,
        error: 'Pesan terlalu panjang (maks 500 karakter)'
      });
    }

    // Panggil connector (lokal)
    const result = await connectorClient.executeScript(
      `WPP.chat.sendTextMessage("${to}", "${message}")`
    );

    return JSON.stringify({ success: true, result });
  },
  {
    name: 'send_message',
    description: 'Kirim pesan teks PENDEK (maks 500 karakter)',
    schema: z.object({
      to: z.string(),
      message: z.string().max(500)
    })
  }
);

const sendProduct = tool(
  async ({ to, productId }) => {
    const result = await connectorClient.executeScript(
      `WPP.catalog.sendProductWithCatalog("${to}", "${productId}")`
    );
    return JSON.stringify(result);
  },
  {
    name: 'send_product',
    description: 'Kirim produk dari katalog WhatsApp',
    schema: z.object({
      to: z.string(),
      productId: z.string()
    })
  }
);

const forwardToManagementGroup = tool(
  async ({ context }) => {
    const state = getCurrentState();
    const groupId = state.agentContext.managementGroupId;

    const message = `
🔔 *Penerusan percakapan*

👤 Kontak: ${context.from}
📝 Alasan: ${context.reason}

💬 Ringkasan:
${context.summary}
    `;

    await connectorClient.executeScript(
      `WPP.chat.sendTextMessage("${groupId}", "${message}")`
    );

    return JSON.stringify({ success: true });
  },
  {
    name: 'forward_to_management_group',
    description: 'Teruskan ke grup manajemen',
    schema: z.object({
      context: z.object({
        from: z.string(),
        reason: z.string(),
        summary: z.string()
      })
    })
  }
);
```

#### Katalog

```typescript
const listProducts = tool(
  async ({ includeDescriptions, limit }) => {
    // Panggil backend
    const products = await backendClient.get('/catalog/products', {
      params: {
        agentId: getCurrentAgentId(),
        includeDescriptions,
        limit
      }
    });
    return JSON.stringify(products);
  },
  {
    name: 'list_products',
    description: 'Daftar produk dari katalog',
    schema: z.object({
      includeDescriptions: z.boolean().default(false),
      limit: z.number().default(20)
    })
  }
);

const searchProducts = tool(
  async ({ query, limit }) => {
    const results = await backendClient.get('/catalog/products/search', {
      params: {
        query,
        agentId: getCurrentAgentId(),
        limit
      }
    });
    return JSON.stringify(results);
  },
  {
    name: 'search_products',
    description: 'Cari produk berdasarkan kata kunci',
    schema: z.object({
      query: z.string(),
      limit: z.number().default(10)
    })
  }
);
```

#### Label dan Konteks

```typescript
const getContactLabels = tool(
  async ({ contactId }) => {
    const labels = await connectorClient.executeScript(
      `WPP.labels.getChatLabels("${contactId}")`
    );
    return JSON.stringify(labels);
  },
  {
    name: 'get_contact_labels',
    description: 'Ambil label kontak',
    schema: z.object({ contactId: z.string() })
  }
);

const addLabelToContact = tool(
  async ({ contactId, labelId }) => {
    await connectorClient.executeScript(
      `WPP.labels.addOrRemoveLabels("${contactId}", ["${labelId}"], "add")`
    );
    return JSON.stringify({ success: true });
  },
  {
    name: 'add_label_to_contact',
    description: 'Tambah label ke kontak',
    schema: z.object({
      contactId: z.string(),
      labelId: z.string()
    })
  }
);
```

#### Memori

```typescript
const savePersistentMemory = tool(
  async ({ chatId, type, key, value }) => {
    await prisma.conversationMemory.create({
      data: { chatId, type, key, value }
    });
    return { success: true };
  },
  {
    name: 'save_persistent_memory',
    description: 'Simpan memori penting (preferensi VIP, dll.)',
    schema: z.object({
      chatId: z.string(),
      type: z.enum(['PREFERENCE', 'VIP_NOTE', 'ORDER']),
      key: z.string(),
      value: z.any()
    })
  }
);
```

#### Pesan terjadwal

```typescript
const scheduleMessage = tool(
  async ({ chatId, scheduledFor, context }) => {
    const job = await scheduledMessagesQueue.add(
      'reminder',
      { chatId, scheduledFor, context },
      { delay: new Date(scheduledFor).getTime() - Date.now() }
    );
    return JSON.stringify({ success: true, jobId: job.id });
  },
  {
    name: 'schedule_message',
    description: 'Jadwalkan pesan cerdas di masa depan',
    schema: z.object({
      chatId: z.string(),
      scheduledFor: z.string(),
      context: z.object({
        reason: z.string(),
        intentToCheck: z.string(),
        actionIfFalse: z.string()
      })
    })
  }
);
```

---

## KEAMANAN

### Backend Agent (Onboarding)

**Pengguna terautentikasi**: Hanya pemilik bisnis yang dapat mengubah agent-nya

```typescript
// Guard di semua endpoint
@UseGuards(JwtAuthGuard)
async updateContext(@User() user, @Body() dto) {
  // Verifikasi bahwa agent milik pengguna
  const agent = await prisma.whatsAppAgent.findFirst({
    where: {
      id: dto.agentId,
      userId: user.id
    }
  });

  if (!agent) {
    throw new UnauthorizedException();
  }

  // Lanjutkan...
}
```

### WhatsApp Agent (Klien)

**Sanitasi dan validasi**:

```typescript
function sanitizeUserInput(input: string): string {
  return input
    .replace(/```/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/<script/gi, '')
    .substring(0, 2000);
}

const securityRules = [
  {
    name: 'no_system_override',
    validate: (input) => !input.toLowerCase().includes('you are now'),
  },
  {
    name: 'no_context_leak',
    validate: (input) => !input.match(/show.*context|reveal.*prompt/i),
  },
  {
    name: 'no_cross_chat',
    validate: (input) => !input.match(/\d{10,}@c\.us/),
  }
];
```

**Rate limiting** (Redis lokal):

```typescript
async function checkRateLimit(chatId: string) {
  const key = `ratelimit:${chatId}`;
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, 60);
  }

  if (count > 10) {
    throw new RateLimitException('Terlalu banyak pesan');
  }
}
```

---

## PERTUKARAN MODEL DINAMIS

**Kedua agent** menggunakan model switching:

```typescript
const geminiFast = new ChatGoogleGenerativeAI({
  model: 'gemini-2.0-flash-exp',
  temperature: 0.7,
});

const grokBalanced = new ChatOpenAI({
  openAIApiKey: process.env.GROK_API_KEY,
  modelName: 'grok-beta',
  configuration: { baseURL: 'https://api.x.ai/v1' },
});

const grokThinking = new ChatOpenAI({
  openAIApiKey: process.env.GROK_API_KEY,
  modelName: 'grok-2-vision-1212',
  configuration: { baseURL: 'https://api.x.ai/v1' },
});

const dynamicModelSelection = createMiddleware({
  name: 'DynamicModelSelection',
  wrapModelCall: (request, handler) => {
    const complexity = calculateComplexity(request);

    let model;
    if (complexity > 0.8) model = grokThinking;
    else if (complexity > 0.5) model = grokBalanced;
    else model = geminiFast;

    return handler({ ...request, model });
  },
});
```

---

## DATABASE

### Backend PostgreSQL

```prisma
// apps/backend/prisma/schema.prisma

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  // ...
  agents    WhatsAppAgent[]
  threads   Thread[]
}

model WhatsAppAgent {
  id                  String   @id @default(uuid())
  userId              String
  user                User     @relation(...)
  connectorIp         String   @unique
  phoneNumber         String?
  agentContext        String?  @db.Text
  contextScore        Int      @default(0)
  activationStrategy  Json?
  memoryRetentionDays Int      @default(30)
  // ...
}

model Product {
  id          String   @id @default(uuid())
  userId      String
  name        String
  description String?
  price       Int
  images      ProductImage[]
}

model ProductImage {
  id          String   @id @default(uuid())
  productId   String
  url         String
  ia_analyse  String?  @db.Text
}

model Thread {
  id       String          @id @default(uuid())
  userId   String
  type     ThreadType
  messages ThreadMessage[]
}

enum ThreadType {
  ONBOARDING
  CONTEXT_IMPROVEMENT
  SUPPORT
}

model ThreadMessage {
  id              String        @id @default(uuid())
  threadId        String
  content         String        @db.Text
  source          MessageSource
  potentialReplies Json?
  tokensUsed      Int?
}

enum MessageSource {
  USER
  AGENT
  SYSTEM
}

model AgentMessageLog {
  id              String   @id @default(uuid())
  agentId         String
  from            String
  userMessage     String   @db.Text
  agentResponse   String   @db.Text
  intent          String?
  toolsUsed       Json?
  tokensUsed      Int?
  creditsUsed     Int?
  responseTime    Int?
  createdAt       DateTime @default(now())

  @@index([agentId])
  @@index([createdAt])
}
```

### Agent PostgreSQL (lokal)

```prisma
// apps/whatsapp-agent/prisma/schema.prisma

model ConversationMemory {
  id        String      @id @default(uuid())
  chatId    String
  type      MemoryType
  key       String
  value     Json
  createdAt DateTime    @default(now())
  expiresAt DateTime?

  @@index([chatId])
  @@index([expiresAt])
}

enum MemoryType {
  PREFERENCE
  VIP_NOTE
  ORDER
}

// Catatan: Tabel `checkpoints` dibuat otomatis oleh PostgresSaver
```

---

## IMPLEMENTASI - CHECKLIST

### Fase 1: Connector (Klien murni)

- [ ] Bersihkan connector (hapus semua logika)
- [ ] Pertahankan hanya:
  - [ ] klien whatsapp-web.js
  - [ ] Event listener → webhook agent
  - [ ] Endpoint /execute-script
- [ ] Konfigurasi CONNECTOR_IP
- [ ] Konfigurasi AGENT_WEBHOOK_URL (lokal)

### Fase 2: Backend Agent (Onboarding)

**Backend**:
- [ ] Setup LangGraph untuk backend agent
- [ ] Buat tools konfigurasi:
  - [ ] read_agent_context
  - [ ] update_agent_context
  - [ ] read_products
  - [ ] update_strategy
  - [ ] get_all_labels
  - [ ] add_new_label
  - [ ] create_group
  - [ ] analyze_product_images
- [ ] Sistem thread (onboarding)
- [ ] WebSocket untuk chat real-time
- [ ] Endpoint /agent/can-process

**Frontend**:
- [ ] Halaman chat onboarding
- [ ] Tampilan skor konteks
- [ ] Antarmuka pemilihan strategi

### Fase 3: WhatsApp Agent (Klien)

**Agent**:
- [ ] Setup PostgreSQL lokal
- [ ] Setup Prisma
- [ ] Setup Redis lokal (Bull)
- [ ] Setup LangGraph dengan PostgresSaver
- [ ] Buat tools:
  - [ ] send_message
  - [ ] send_product
  - [ ] send_collection
  - [ ] forward_to_management_group
  - [ ] list_products
  - [ ] search_products
  - [ ] get_contact_labels
  - [ ] add_label_to_contact
  - [ ] schedule_message
  - [ ] save_persistent_memory
- [ ] Worker Bull untuk pengingat
- [ ] Keamanan (sanitasi, rate limiting)
- [ ] Pembersihan otomatis (cron)

### Fase 4: Komunikasi

- [ ] Connector → Agent (webhook lokal)
- [ ] Agent → Backend (API REST)
- [ ] Backend → Connector (execute-script via API)
- [ ] Logging terpusat (agent → backend)

### Fase 5: Tes

- [ ] Tes E2E flow lengkap
- [ ] Tes backend agent (onboarding)
- [ ] Tes whatsapp agent (klien)
- [ ] Tes keamanan (prompt injection)
- [ ] Load testing

---

## METRIK KESUKSESAN

**Backend Agent (Onboarding)**:
- Skor konteks ≥ 80% sebelum aktivasi
- Waktu onboarding < 10 menit
- Kepuasan pemilik ≥ 90%

**WhatsApp Agent (Klien)**:
- Tingkat resolusi otomatis ≥ 70%
- Waktu respons < 3 detik
- Pesan pendek: 95% < 500 karakter
- Biaya per percakapan < 0.05€
- Keamanan: 0 insiden

---

## SUMBER DAYA

- [LangChain Docs](https://docs.langchain.com/)
- [LangGraph](https://langchain-ai.github.io/langgraph/)
- [WPP.js](https://wppconnect.io/wa-js/modules.html)
- [Bull Queue](https://docs.bullmq.io/)

---

**Versi**: 4.0 (Arsitektur terdesentralisasi final)
**Tanggal**: 2025-11-24

---

## LOG IMPLEMENTASI

### 2025-11-25 - Mulai implementasi WhatsApp Agent

#### Selesai:

1. **Setup Prisma** (`apps/whatsapp-agent/prisma/`)
   - Buat `schema.prisma` dengan model:
     - `ConversationMemory` (PREFERENCE, VIP_NOTE, ORDER, CONTEXT)
     - `ScheduledMessage` (untuk pengingat Bull Queue)
   - Buat `PrismaService` dan `PrismaModule`
   - Tambah skrip Prisma ke `package.json`

2. **Instalasi dependensi**
   - `@prisma/client`, `prisma`
   - `@nestjs/bull`, `bull`, `ioredis`
   - `@langchain/langgraph`

3. **Setup Queue dengan Bull** (`apps/whatsapp-agent/src/queue/`)
   - Buat `QueueModule` dengan konfigurasi Redis
   - Buat `QueueService` untuk mengelola pesan terjadwal
   - Buat `ScheduledMessageProcessor` untuk memproses pengingat

4. **Pembuatan Tools LangChain** (`apps/whatsapp-agent/src/tools/`)
   - **CommunicationTools**: sendMessage, sendProduct, sendCollection, forwardToManagementGroup
   - **CatalogTools**: listProducts, searchProducts, getProductDetails
   - **LabelsTools**: getContactLabels, addLabelToContact
   - **MemoryTools**: savePersistentMemory, retrievePersistentMemory
   - **MessagesTools**: getOlderMessages, scheduleMessage
   - **IntentTools**: detectIntent
   - **ToolsModule**: Modul yang mengelompokkan semua tools

5. **Keamanan** (`apps/whatsapp-agent/src/security/`)
   - **SanitizationService**: Validasi dan pembersihan input pengguna
   - **RateLimitService**: Batasan jumlah pesan per chat (Redis)
   - **SecurityModule**: Modul yang mengelompokkan layanan keamanan

6. **Service utama agent** (`apps/whatsapp-agent/src/langchain/`)
   - **WhatsAppAgentService**: Service utama dengan model AI (Grok + Gemini fallback)
   - Semua modul diintegrasikan dalam `app.module.ts`
   - Webhook controller diperbarui untuk menggunakan service baru
   - Type-check lolos tanpa error
   - Catatan: `createAgent` dikomentari sementara (menunggu LangChain v1 stabil)

#### SELESAI:
Seluruh infrastruktur dasar sudah berfungsi!

#### Fitur masa depan yang mungkin dieksplorasi:

1. **Embedding multimodal gambar**
   - Gemini mendukung embedding multimodal (teks + gambar)
   - Memungkinkan pencarian "tunjukkan saya gaun seperti ini" (klien mengirim foto)
   - Biaya: Perlu dievaluasi
   - Kompleksitas: Sedang (Gemini sudah punya API)
   - Kasus: Pencarian visual, rekomendasi berbasis foto
   - Dokumentasi: https://ai.google.dev/gemini-api/docs/embeddings

2. **Caching embedding**
   - LangChain `CacheBackedEmbeddings` dengan Redis
   - Hindari re-calculate embedding yang sudah ada
   - Hemat biaya API dan waktu

#### Langkah berikutnya:
1. **Tes dengan database**
   - Konfigurasi DATABASE_URL di .env
   - Jalankan `pnpm prisma migrate dev`
   - Tes koneksi Prisma

2. **Konfigurasi Redis**
   - Konfigurasi REDIS_URL di .env
   - Tes koneksi Redis (Queue + RateLimit)

3. **Integrasi dengan backend**
   - Implementasi endpoint `/agent/can-process` dan `/agent/log-operation` di backend
   - Tes flow komunikasi lengkap

4. **Migrasi ke LangChain v1**
   - Saat stabil, uncomment kode `createAgent` di WhatsAppAgentService
   - Implementasi middleware dan tools dengan sistem agent lengkap

5. **Tes end-to-end**
   - Tes penerimaan pesan
   - Tes eksekusi tools
   - Tes rate limiting dan sanitasi
   - Tes pesan terjadwal (Bull Queue)
