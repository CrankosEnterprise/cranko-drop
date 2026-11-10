# Cranko Drop — Universal Download & Conversion Hub

![Cranko Drop](build/icon.png)

O **Cranko Drop** é um aplicativo desktop completo, moderno e instalável, projetado como um hub universal para centralizar o download de mídias e arquivos da internet, além de oferecer um estúdio completo de conversão e organização inteligente em categorias.

---

## ⚡ Principais Recursos

### 1. Sistema Universal de Downloads
- **Detecção Inteligente de URLs**: Basta colar um link ou arrastar uma URL para o aplicativo identificar automaticamente o conteúdo e o mecanismo ideal.
- **yt-dlp Integrado**: Suporte a YouTube, TikTok, Instagram, Twitter/X, Vimeo, Twitch e centenas de plataformas de mídia, com identificação de metadados, capas, duração, playlists e seleção de resoluções (4K, 1080p, 720p, apenas áudio MP3/M4A).
- **aria2**: Suporte a conexões paralelas multi-segmentadas para downloads ultrarrápidos e pesados.
- **gallery-dl**: Coleta em massa e organização de álbuns e galerias de fotos de sites de arte e redes sociais.
- **Motor Próprio Resiliente (Node.js Direct Stream)**: Suporte a streaming com Range requests (pausa e retomada real), cálculo preciso de velocidade em tempo real e verificação de integridade.

### 2. Estúdio de Conversão Universal
- **Conversão de Imagens**: PNG, JPG/JPEG, WebP, AVIF, GIF, BMP, TIFF, ICO.
  - Dimensionamento customizado (largura/altura mantendo proporção).
  - Controle de qualidade e compressão.
  - Conversão em lote e preservação de transparência.
- **Conversão de Áudio**: MP3, WAV, FLAC, AAC, OGG, OPUS, M4A.
  - Ajuste de bitrate (128k, 192k, 256k, 320k) e fidelidade de áudio.
  - Extração de áudio diretamente de arquivos de vídeo.
- **Conversão de Vídeos**: MP4, MKV, WEBM, MOV, AVI, GIF animado.
  - Controle de resolução (1080p, 720p, 480p), codecs (H.264, H.265/HEVC, VP9) e redução de tamanho.
- **Conversão de Documentos**: Imagens para PDF consolidado e conversão de páginas.
- **Regra de Segurança**: Nunca sobrescreve arquivos originais automaticamente.

### 3. Arrastar e Soltar (Drag & Drop)
- Arraste qualquer arquivo local (imagem, áudio, vídeo, documento) direto na janela.
- Identificação instantânea de formato e sugestão de ações imediatas em 1 clique (ex: "Converter PNG para WebP", "Extrair Áudio de Vídeo MP4", etc.).
- Arquitetura pronta para futura integração de pesquisa reversa de imagens.

### 4. Biblioteca Inteligente
- Organização automática por categorias:
  - 🎬 **Vídeos**
  - 🎵 **Áudios**
  - 🖼️ **Imagens**
  - 📄 **Documentos**
  - 📦 **Compactados**
  - 💻 **Programas**
  - 📁 **Outros**
- Pesquisa instantânea por nome e formato.
- Alternância entre visualização em Grade visual e Lista compacta.
- Ações: Abrir no player/aplicativo padrão, Mostrar no Explorador de Arquivos do Windows, Enviar para o Conversor, Renomear e Excluir (com envio seguro para a Lixeira do SO).

### 5. Experiência Visual & Identidade
- Tema **Dark Violet / Deep Amethyst** com acentos elétricos neon.
- Barra de título frameless moderna com controles nativos de minimizar, maximizar e fechar.
- Painéis com efeito Glassmorphism suave, tipografia limpa e responsiva.
- Totalmente silencioso: funciona sem terminais pretos abrindo no Windows.

---

## 🛠️ Tecnologias Utilizadas

- **Execução Desktop:** Electron 34
- **Interface:** React 18 + TypeScript + Vite
- **Estilização:** Tailwind CSS + Lucide React + Glassmorphism
- **Mecanismos:** yt-dlp, FFmpeg / FFprobe, aria2c, gallery-dl e HTTP Chunked Stream nativo
- **Empacotador:** electron-builder (Instalador NSIS para Windows e AppImage/DEB para Linux)

---

## 📦 Como Desenvolver e Executar

### Pré-requisitos
- Node.js 18+ (recomendado v20 ou superior)
- npm ou yarn

### 1. Clonar e Instalar Dependências
```powershell
git clone https://github.com/usuario/cranko-drop.git
cd cranko-drop
npm.cmd install
```

### 2. Baixar os Utilitários Portáteis (Opcional, o app também possui auto-download interno)
```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-binaries.ps1
```

### 3. Executar em Modo de Desenvolvimento
```powershell
npm.cmd run dev
```

### 4. Gerar o Instalador Executável para Windows (.exe NSIS)
```powershell
npm.cmd run pack:win
```
O instalador `.exe` e a versão portátil serão gerados automaticamente na pasta:
- Instalador NSIS: `release/1.0.1/Cranko Drop Setup 1.0.1.exe`
- Versão Portátil: `release/1.0.1/Cranko Drop 1.0.1.exe`
- Versão Descompactada: `release/1.0.1/win-unpacked/Cranko Drop.exe`

### 5. Gerar Distribuição para Linux (AppImage / DEB)
```bash
npm run pack:linux
```

---

## 🔒 Segurança e Privacidade

- Nenhum arquivo baixado é executado automaticamente.
- Tratamento de URLs externas e validação rigorosa de caminhos de arquivo.
- Armazenamento 100% local no diretório seguro de dados do usuário (`%APPDATA%/cranko-drop` no Windows e `~/.config/cranko-drop` no Linux).
- Respeito a autenticação e restrições legais das plataformas.
