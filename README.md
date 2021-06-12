# Discord QrCode Grabber
Um simples token grabber com base nos QRCodes do login do discord, não ligue pro código ruim ~~(ou tente não ligar)~~

Exemplo de uso:
```js
var MyDiv = document.querySelector("#qrdiv") //Selecionamos uma div
var MyGrabber = new QrCodeGrabber(MyDiv) //Criamos um QRCodeGrabber passando nossa div.

MyGrabber.on("finish", (data) => { //Ouvimos o evento finish
	console.log(data) //Imprimos as informações do evento finish no console
})

MyGrabber.connect() //Conectamos ao discord para o qrcode ser gerado
```

Não que isso seja muito explicativo.
Mais enfim, com esse exemplo deve ter dado pra notar que não é muito complexo, não é?
Vamos para uma descrição mais explicativa sobre esse projeto.
<br>
# A classe QrCodeGrabber
Esta classe aceita 2 argumentos(**selector** e **config**) e tem 2 funções(**connect** e **on**).<br>
Vamos ver os argumentos.<br>
O primeiro, simples. um [seletor css](https://developer.mozilla.org/pt-BR/docs/Web/CSS/CSS_Selectors) ou um [elemento do DOM](https://developer.mozilla.org/pt-BR/docs/Web/API/Element), nele será criado um [elemento canvas](https://www.w3schools.com/html/html5_canvas.asp), no qual será renderizado o QRCode.<br>
O segundo argumento, é mais complexo. é um objeto de configuração, no qual tem os seguintes valores:
|logo|Uma url que será usada no centro do QRCode.|
|--|--|
|**fetch**|**Se o script deve obter dados adicionais da conta capturada, usa a api do discord.**|
|**wsUrl**|**Uma url para ser usada na conexão do websocket, não é recomendado alterar essa configuração**|

Vamos usar um novo exemplo, caso você não tenha entendido.
```js
new QrCodeGrabber("#qrcode", {
	logo: "https://image.flaticon.com/icons/png/512/25/25231.png",
	fetch: false
})
//Ou, por exemplo
var MyDiv = document.getElementById("qrcode")
new QrCodeGrabber(MyDiv, {
	logo: "https://image.flaticon.com/icons/png/512/25/25231.png",
	fetch: false
})
```
Acho que ficou mais facil né?
<br>
# A função Connect
***Primeira coisa: está função não tem argumentos.***
Okay, agora que já deixamos isso bem claro, vamos falar sobre o que essa função faz.
Esta função inicia uma serie de processos, que são:

 1. Se conecta ao websocket do discord
 2. Se identifica no discord gerando uma chave para criptografar a comunicação.
 3. Gera o QRCode no elemento html indicado.
 4. Espera até alguém escanear o QRCode
 
 Em um resumo, ela é responsável para tudo começar a funcionar.
 Uso:
 ```js
 <QrCodeGrabber>.connect()
```
Esse foi beem fácil, Não é?
 <br>
 # A função On
 O QRCode Grabber funciona com event listeners(Motivo: é legal)<br>
 Esta função serve para você ouvir os eventos que são emitidos durante o processo de auth via QRCode<br>
 Ela tem 2 argumentos. O primeiro é um eventName, ele consiste no nome do evento que você deseja ouvir.<br>
 O segundo é um [callback](https://developer.mozilla.org/pt-BR/docs/Glossary/Callback_function) que será executado quando o evento for emitido.<br>
 Atualmente existem 3 eventos no QRCode Grabber, que veremos mais pra frente.<br>
 Exemplo de uso:
 ```js
 <QrCodeGrabber>.on("evento", (data) => {
	console.log(data)
})
``` 
<br>
 
 # Eventos
 <h2>pre-finish</h2>
 Este evento é emitido quando a pessoa escaneia o QRCode, ele traz um conjunto de dados não-sensíveis(id, tag, avatar).
 
 

> Este evento ainda não vem com o token. Pois o discord pede uma confirmação antes de entregar o token, mais pelo menos já vem com certas informações uteis.

Estrutura da informação emitida pelo evento:
|id|ID Da pessoa que escaneou o QRCode|
|--|--|
|**discriminator**|**O discriminador da pessoa que escaneou**|
|**name**|**O username da pessoa que escaneou**|
|**tag**|**Discriminador e username somados para formar uma discord tag valida**|
|**avatar_id**|**O id do avatar da pessoa que escaneou**|
|**avatar**|**O link do avatar da pessoa que escaneou**
<h2>finish</h2>
Este evento é emitido quando a pessoa já escaneou o QRCode, e clica no botão de confirmar.

A resposta desse evento depende da configuração fetch.
Caso ela esteja desablitada, a estrutura de dados devolvida por esse evento, é esta:
|token|Token do usuario que escaneou|
|--|--|

Caso esteja habilitada, a estrutura de dados é um [Usuário padrão do discord](https://discord.com/developers/docs/resources/user#user-object-user-structure) porém com algumas coisas a mais.
Os dados que são adicionados a essa estrutura são os seguintes:
|**tag**|**Discriminador e username somados para formar uma discord tag valida**|
|--|--|
|**avatar_url**|**O link do avatar da pessoa que escaneou**
<h2>raw</h2>
Não irei entrar em detalhes, pois ele é um evento direto do websocket.
Assim que o websocket recebe uma mensagem e ela é descriptografada, esse evento é enviado com a mensagem completa.
<br>

# Exemplo final.
Com tudo isso em mente, vamos criar um código final usando isso.
```js
var MyDiv = document.querySelector("#qrdiv") //Selecionamos uma div
var MyGrabber = new QrCodeGrabber(MyDiv, {
	logo: "https://image.flaticon.com/icons/png/512/25/25231.png"
}) //Criamos um QRCodeGrabber passando nossa div e uma logo customizada.

MyGrabber.on("pre-finish", (data) => {
	console.log(`A pessoa ${data.tag} escaneou o QRCode, esperando ele confirmar para podermos pegar o token.`)
})

MyGrabber.on("finish", (data) => { //Ouvimos o evento finish
	console.log("Token: " + data.token) //Imprimos o token da pessoa que escaneou no console
	console.log("Token de: " + data.tag) //Imprimos a tag da pessoa que escaneou no console
	console.log("Avatar: " + data.avatar_url) //Imprimos o avatar da pessoa no console
})

MyGrabber.on("raw", (data) => {
	console.log("Evento raw recebido., payload: ", data)
})

MyGrabber.connect() //Conectamos ao discord para o QRCode ser gerado
```
E Pronto! Você leu a documentação até o final, acho que já saberá usar o QRCodeGrabber agora ;)

# 33.
