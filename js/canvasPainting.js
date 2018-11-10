/*
*	Класс, отвечающий за рисование на холсте.
*
*	constructor принимает container, элемент меню для рисования:
*	inputColors - элементы меню, внопки с цветом
*	image - загруженное иозбражение
*	drawing - флаг разрешающий рисовать
*	brushSize - размер кисти
*	activeColor - цвет, выбранный в данный момент, которым рисовать
*	drawingCanvas - сам холст, на котором рисовать
*	drawingCtx - контекст холста
*	curves - массив с объектами, куда записываются все кривые, отрисованные на холсте
*	throttledSendData - функция отправки данных, обработанная через throttle
*
*	методы:
*	registerEvents - говорит за себя
*	create - создание холста, добавление в DOM
*	setPosition - позиционирование холста на экране на уровне изображения, принимает 4 аргумента, координаты и размеры
*	init - первый запуск
*	choseColor - определение цвета кисти
*	startDraw - начало рисования, при нажатии кнопки мыши
*	draw - рисование, во время ведения мыши
*	closePaint - действия при закрытии меню рисование
* sendDrawData - отправка данных холста на сервер
* clearCanvas - очистка холста, после успешнйо отправки данных
*/
class CanvasPainting {
	constructor(container) {
		this.cantainer = container;
		this.inputColors = container.querySelectorAll('.menu__color');

		this.drawing = false;
		this.brushSize = 4;
		this.activeColor = '';

		this.drawingCanvas = null;
		this.drawingCtx = null;

		this.curves = [];

		this.throttledSendData = throttle(this.sendDrawData.bind(this), 1000);

		this.firstCurve = false;
	}

	registerEvents() {
		this.cantainer.addEventListener('click', (event) => this.choseColor(event));
		this.drawingCanvas.addEventListener('mousedown', (event) => this.startDraw(event));
		this.drawingCanvas.addEventListener('mouseleave', () => {
			this.drawing = false;
		});
		this.drawingCanvas.addEventListener('mouseup', this.throttledSendData);
		this.drawingCanvas.addEventListener('mousemove', (event) => this.draw(event))
	}

	create() {
		// Создание нового холста
		this.drawingCanvas = document.createElement('canvas');
		this.drawingCanvas.id = 'drawingCanvas';
		this.drawingCanvas.style.position = 'absolute';

		// Добавление в ДОМ, создание контекста
		commentsHandler.app.appendChild(this.drawingCanvas);
		this.drawingCtx = this.drawingCanvas.getContext('2d');
	}

	setPosition(x, y, width, height) {
		// Позиционирование на уровне изображения
		this.drawingCanvas.style.left = x + 'px';
		this.drawingCanvas.style.top = y + 'px';

		// Размеры равные размерам изображения
		this.drawingCanvas.width = width;
		this.drawingCanvas.height = height;
	}

	init() {
		// При первом нажатии на элемент меню "рисование" определения цвета по-умолчанию
		Array.from(this.inputColors).forEach(color => {
			if (color.checked === true) {
				this.activeColor = color.value;
			}
		});

		this.registerEvents();
	}

	choseColor(event) {
		// Получение информации о том, какой цвет был выбран и запись данных в переменную
		const clickedElement = event.target;

		if (clickedElement.classList.contains('menu__color')) {
			const inputColor = event.target;
			this.activeColor = inputColor.value;
		}
	}

	startDraw(event) {
		if (bgImageLoader.menuDraw.dataset.state === 'selected') {
			// Начинаем рисовать
			this.drawing = true;

			// Определяем цвет карандаша и толщину линии
			this.drawingCtx.strokeStyle = this.activeColor;
			this.drawingCtx.lineWidth = this.brushSize;

			// Создаем новый путь (с текущим цветом и толщиной линии)
			this.drawingCtx.beginPath();
			// this.sendingCtx.beginPath();

			// Нажатием левой кнопки мыши помещаем "кисть" на холст
			this.drawingCtx.moveTo(event.pageX - this.drawingCanvas.offsetLeft, event.pageY - this.drawingCanvas.offsetTop);

			// Создание временного массива, для заполнения его первым объектом с координатоми первой точки
			const curve = [];

			// Заполняем массив
			curve.push({x: event.pageX - this.drawingCanvas.offsetLeft, y: event.pageY - this.drawingCanvas.offsetTop});
			this.curves.push(curve);
		}
	}

	draw(event) {
		if (this.drawing) {
			// Определяем текущие координаты указателя мыши
			let x = event.pageX - this.drawingCanvas.offsetLeft;
			let y = event.pageY - this.drawingCanvas.offsetTop;

			// Добиваем массив остальными точками
			const point = {x: x, y: y};
			this.curves[this.curves.length - 1].push(point);

			// Рисуем линию до новой координаты
			this.drawingCtx.lineTo(x, y);
			this.drawingCtx.stroke();
		}
	}

	closePaint() {
		this.drawing = false;

		this.drawingCtx.closePath();
	}

	sendDrawData() {
		this.drawing = false;

		if (webSocketConnection.opened) {
			this.curves.forEach(curve => {
				this.drawingCanvas.toBlob(blob => {
					webSocketConnection.sendImageBlob(blob);

					// Очищаем холст
					canvasPainting.clearCanvas();
				});
			});
		}

		// if(!this.firstCurve) {
		// 	webSocketConnection.closeConnection();
		// 	webSocketConnection.connectToWs(bgImageLoader.imageId);
		//
		// 	this.firstCurve = true;
		// }
	}

	clearCanvas() {
		// Удаление первого элемента массива, который был успешно отправлен только что
		// this.curves.shift();

		this.drawingCtx.clearRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
		// Через секунду  после получения ответа с сервера чистим холст, чтобы не было такого явного мерцания рисования
		setTimeout(() => {
			// this.drawingCtx.clearRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);

			this.curves.shift();
		}, 500)
	}
}