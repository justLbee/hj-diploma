/*
* Класс, отвечающий за соединение wss
*
* конструктор не принимает аргументов, имеет одну переменную socketConnection
*
* методы:
* connect - устанавливает соединение с сервером, начинает слушать события
* connectionOpen - говорит в консоль, что соединение открыто
* messageRecieved - реагирует на ивент получения сообщения от сервера, вызывает нужные методы других классов для
* дальнейшей работы приложения
* sendImageBlob - отправляет бинарные данные от холста на сервер
* errorLog - сообщает об обшиках
*
*/
class WebSocketConnection {
	constructor() {
		this.socketConnection = null;
		this.opened = false;
	}

	registerEvents() {
		this.socketConnection.addEventListener('open', event => this.connectionOpen(event));
		this.socketConnection.addEventListener('message', event => this.messageRecieved(event));
		this.socketConnection.addEventListener('error', event => this.errorLog(event));
		this.socketConnection.addEventListener('close', event => this.connectionClosed(event));
	}

	connectToWs(imageId) {
		this.socketConnection = new WebSocket(`wss://neto-api.herokuapp.com/pic/${imageId}`);

		this.registerEvents();
	}

	connectionOpen() {
		console.log('Соединение открыто');
		this.opened = true;
	}

	connectionClosed() {
		console.log('Соединение закрыто')
	}

	messageRecieved(event) {
		const recievedData = JSON.parse(event.data);


		// if (recievedData.event === 'pic') {
      // console.log(recievedData);
      // commentsHandler.init(recievedData.pic.comments);

		// if (recievedData.event === 'pic') {
		// 	setTimeout(() => {
    //     commentsHandler.init(recievedData.pic.comments);
    //   }, 2000);
		// }


			// if (recievedData.pic.mask) {
			// 	bgImageLoader.loadMask(recievedData.pic.mask);
			// }
		// }
    // console.log(recievedData);
    if (recievedData.event === 'mask') {
			bgImageLoader.loadMask(recievedData.url);

			if (!canvasPainting.firstCurve) {
				webSocketConnection.closeConnection();
				webSocketConnection.connectToWs(bgImageLoader.imageId);

				canvasPainting.firstCurve = true;
			}
		}

		if (recievedData.event === 'comment') {
      commentsHandler.addNewComment(recievedData.comment, true);
		}
	}

	sendImageBlob(blob) {
		this.socketConnection.send(blob);
	}

	errorLog(event) {
		console.log(event.data);
		this.opened = false;
	}

	closeConnection() {
		this.socketConnection.close();
		this.opened = false;
	}
}