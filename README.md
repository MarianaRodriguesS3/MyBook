# Pré-requisitos do Sistema

## Objetivo

Desenvolver uma aplicação em **React** para leitura de arquivos **PDF**, permitindo que o usuário visualize o conteúdo do documento e, opcionalmente, ouça a leitura em voz alta do texto presente no PDF.

As imagens contidas no documento deverão ser exibidas normalmente, sem qualquer tipo de alteração ou processamento.

---

# Funcionalidades

## Página Inicial

A página inicial será composta por um **Header** e uma área destinada ao histórico dos arquivos acessados.

### Header

O header deverá conter os seguintes componentes:

#### Menu de Configurações

Um botão representado por um **ícone de três barras (☰)**.

Ao ser clicado, deverá abrir um menu lateral (ou dropdown) contendo as seguintes configurações:

### Tema

Opção para alterar a aparência da aplicação.

Temas disponíveis:

- **Dia**
  - Fundo branco
  - Texto preto

- **Noite**
  - Fundo preto
  - Texto branco

- **Azul**
  - Fundo azul escuro
  - Texto branco

- **Verde**
  - Fundo verde escuro
  - Texto branco

- **Matrix**
  - Fundo preto
  - Texto verde

> **Observação:** As imagens exibidas no PDF não deverão sofrer qualquer alteração de cor ou aparência ao trocar o tema.

---

### Idioma

Permitir a seleção do idioma da interface da aplicação.

Idiomas disponíveis:

- Português (pt-BR)
- Inglês (en-US)
- Espanhol (es-ES)

---

### Fala (Text-to-Speech)

Permitir ativar ou desativar a leitura em voz alta do texto.

Quando ativada:

- Exibir a mensagem:

```
Habilitado 🔊
```

Quando desativada:

```
Desabilitado 🔇
```

O estado deverá alternar sempre que o usuário clicar sobre o ícone.

Quando a fala estiver desabilitada, nenhuma leitura em voz deverá ser iniciada.

---

### Abrir Arquivo

Ao lado do botão de menu deverá existir:

```
Lendo Agora 🔍
```

Ao clicar na lupa:

- abrir o seletor de arquivos do dispositivo;
- permitir selecionar arquivos PDF.

Após selecionar um arquivo válido, a aplicação deverá abrir o leitor de PDF.

---

## Histórico

Abaixo do header deverá ser exibido um histórico contendo os PDFs acessados anteriormente.

Cada item do histórico deverá permitir abrir novamente o respectivo documento.

---

# Página do Leitor

Após selecionar um PDF, o usuário será direcionado para a página de leitura.

A interface deverá lembrar um livro digital.

---

## Modos de Leitura

A aplicação deverá possuir dois modos de visualização.

### Modo Retrato

- Exibir apenas uma página por vez.

---

### Modo Paisagem

- Exibir duas páginas lado a lado.
- Simular a abertura de um livro.

---

# Rodapé

O rodapé concentrará todos os controles do leitor,

Os controles deverão ser distribuídos da seguinte forma:

## Lado Esquerdo

### Voltar para a Página Inicial

Botão representado por uma seta (`←`).

Ao ser clicado, o usuário deverá retornar à página inicial da aplicação.

---

## Centro

### Página Anterior

Botão representado por:

```
<
```

Permite navegar para a página anterior do documento.

---

### Reprodução da Leitura

Botão responsável por:

- iniciar a leitura;
- pausar a leitura;

Caso a funcionalidade de fala esteja desativada nas configurações, este botão deverá permanecer desabilitado e exibir um ícone indicando que a leitura está indisponível.

---

### Pesquisa

Campo de pesquisa capaz de localizar:

- número da página;
- palavras existentes no texto do PDF.

Ao localizar um único resultado, o leitor deverá navegar automaticamente para a página correspondente.

Caso existam múltiplas ocorrências para o termo pesquisado, o leitor deverá exibir uma lista contendo todos os resultados encontrados, informando, sempre que possível:

- número da página;
- trecho do texto onde o termo foi localizado (contexto da ocorrência).

Ao selecionar um dos resultados apresentados, o leitor deverá navegar automaticamente para a página correspondente e posicionar a visualização na ocorrência selecionada.

---

### Contador de Página

Exibir a página atual e a quantidade total de páginas do documento.

Exemplo:

```
15 / 280
```

---

### Próxima Página

Botão representado por:

```
>
```

Permite navegar para a próxima página do documento.

---

## Lado Direito

### Alternar Modo de Visualização

Botão responsável por alternar entre:

- **Modo Retrato** (uma página por vez);
- **Modo Paisagem** (duas páginas lado a lado).

O ícone deverá indicar o modo que será ativado ao clicar no botão.

# Leitura em Voz Alta

A aplicação deverá utilizar a API de síntese de voz do navegador para realizar a leitura do texto.

Requisitos:

- ler apenas textos presentes no PDF;
- ignorar imagens;
- permitir iniciar, pausar e continuar a leitura;
- respeitar o idioma selecionado pelo usuário;
- reiniciar a leitura da nova página, caso a fala esteja ativada.

---

# Efeito de Troca de Página

Sempre que o usuário navegar entre páginas deverá ocorrer:

- animação simulando uma página sendo virada; 
- reprodução de um efeito sonoro de página sendo folheada. 

---

# Requisitos Técnicos

- Desenvolvido em React.
- Interface responsiva.
- Suporte aos principais navegadores modernos.
- Utilização de PDF.js para renderização dos arquivos PDF.
- Utilização da Web Speech API para leitura em voz alta.
- Sistema de internacionalização (i18n) para os idiomas suportados.
- Persistência das configurações do usuário (tema, idioma e fala) utilizando Local Storage.
- Persistência do histórico de arquivos acessados utilizando Local Storage.

---

# Fluxo da Aplicação

1. O usuário abre a aplicação.
2. Seleciona um PDF através da lupa.
3. O arquivo é armazenado no histórico.
4. O leitor é aberto.
5. O usuário escolhe entre modo retrato ou paisagem.
6. O texto é exibido normalmente.
7. Caso a fala esteja ativada, o conteúdo textual da página é lido automaticamente.
8. O usuário pode navegar entre páginas utilizando os controles inferiores.
9. A cada mudança de página ocorre a animação e o efeito sonoro de folha sendo virada.
10. O usuário pode retornar à página inicial utilizando a seta localizada no topo da tela.





# Feito 
 - Continuar com as configurações do audio para que ele mude automaticamente para a proxima pagina que contenha texto.
 - Mudança de pagina automática que acompanha o audio.
 - Configurar o botao da fala no menu para que ele habilite ou desabilite os botoes de play e pause no footerReader.
 - Mudar o icone de play quando ele estiver desabilitado para um play cortado.
 - Ajustar layout do FooterReader.
 - Configurar o input de busca por palavras e paginas.
 - Trocar as frases:
Quando ativada: Exibir a mensagem: Habilitado 🔊
Quando desativada: Desabilitado 🔇
- Mudar o icone da lupa: Lendo Agora 🔍
- Corrigir a exibição das paginas no modo deitado sempre mostrar nomero impar 1/5 3/5...
- Guardar tema, idioma e pagina 


# Falta fazer

- Efeito sonoro e visual de Troca de Página

