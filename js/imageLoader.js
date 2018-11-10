/*
* Класс, отвечающий за загрузку изображения
*
* Конструктор:
* contsiner - все элементы дом в обертке wrap
* currentImage - элемент, изображение
* inputImage - инпут файл, созданный выше
* imageLoader - лоадер, отображаемый во время загрузки изображения
* imageError - окно с ошибкой, возникающей при загрузке файла
* errorMessage - само сообщение об ошибке
* commentForm - форма с комментариями
* menu - меню
* menuBurger - кнопка возврата назад
* menuShare, shareTools - кнопка поделиться и ее внутренние элементы
* menuDraw, drawTools - кнопка рисовать и цвета кисти
* menuComments, commentsTools - кнопка комментарии элементы управления ими
* imageId - идентификатор изображения после загрузки
* loadedMask - загруженная маска с рисунками
* loadedFromLink - информация, чт мы вошли в приложения из ссылки "поделиться" или сами открыли приложение
*
* методы:
* init - инициализация класса
* registerEvents - слушатели
* loadFile - метод загрузки файла
* upLoadFile - метод закачки изображения на сервер
* getImageData - получение информации с сервера о загруженном изображении, идентификатор, маска, комменты
* loadMask - загрузка маски с рисунками от пользователей
* shareClick, drawClick, commentClick - методы реагирующие на нажатие элементов меню
* menuClickHandler - обработчик события нажатия на меню
* showHint - показывать
* getStorageData - получение идентификатора изображения из локалстораджа
*
*/
class BgImageLoader {
	constructor(container) {
		this.container = container;
		this.currentImage = container.querySelector('.current-image');
		this.inputImage = container.querySelector('#uploadInput');
		this.imageLoader = container.querySelector('.image-loader');
		this.imageError = container.querySelector('.error');
		this.errorMessage = container.querySelector('.error__message');

		this.commentForm = document.querySelector('.comments__form');

		this.menu = container.querySelector('.menu');
		this.menuBurger = container.querySelector('.burger');

		this.menuShare = container.querySelector('.share');
		this.shareTools = container.querySelector('.share-tools');

		this.menuDraw = container.querySelector('.draw');
		this.drawTools = container.querySelector('.draw-tools');

		this.menuComments = container.querySelector('.comments');
		this.commentsTools = container.querySelector('.comments-tools');

		this.imageId = null;
		this.loadedMask = document.createElement('img');
		this.container.insertBefore(this.loadedMask, this.imageError);

		this.loadedFromLink = false;


		// Зашли в класс, инициалихировались, слушаем события
		this.init();
		this.registerEvents();

		// Если зашли не через ссылку из "поделиться" загружаем картинку из локалстораджа
		if (!this.loadedFromLink) {
			this.getImageData(this.imageId);
		}
		this.webSocketConnection = null;
	}

	init() {
		// Устанавливаем в окне начальное состояние
		this.menu.dataset.state = 'initial';
		this.menu.dataset.type = 'initial';
		this.menuBurger.style.display = 'none';

		this.currentImage.src = '';
		this.container.removeChild(this.commentForm);

		// Смотрим урл, если там есть id, то подгружаем картинку и данные
		const urlImgID = new URL(`${window.location.href}`).searchParams.get("id");
		if (urlImgID) {
			this.loadedFromLink = true;
			this.getImageData(urlImgID);
		}
	}

	registerEvents() {
		this.container.addEventListener('drop', event => this.loadFile(event));
		this.container.addEventListener('dragover', e => {
			e.preventDefault();
		});

		menuNew.addEventListener('click', event => {
			event.preventDefault();

			const newEvent = new MouseEvent(event.type, event);
			this.inputImage.dispatchEvent(newEvent);
		});

		this.inputImage.addEventListener('click', event => {
			event.stopPropagation();
		});

		this.inputImage.addEventListener('change', event => this.loadFile(event));
		this.menu.addEventListener('click', event => this.menuClickHandler(event));
		this.menuShare.addEventListener('click', event => this.shareClick(event));
		this.menuDraw.addEventListener('click', event => this.drawClick(event));
		this.menuComments.addEventListener('click', event => this.commentClick(event));

		window.addEventListener('resize', event => this.onResizeReload(event))
	}

	loadFile(e) {
		e.preventDefault();
		let file;

		// Разобрали полученный файл, есил файл уже загружен, не даем загружать новый драг-н-дропом
		if (event.currentTarget.files) {
			file = Array.from(event.currentTarget.files)[0];
		}
		else {
			if (this.menu.dataset.state === 'selected' || this.menu.dataset.state === 'default') {
				this.errorMessage.textContent = 'Чтобы загрузить новое изображение, пожалуйста, воспользуйтесь' +
					' пунктом "Згрузить новое" в меню';
				this.showError();
				return;
			}
			file = Array.from(event.dataTransfer.files)[0];
		}

		// Если получили файл отправляем его на загрузку на сервак
		if (file) {
			this.upLoadFile(file);
		}

		dragMenu.setMenuSize();
	}

	upLoadFile(file) {
		// Регулярки проверки, что картинка
		const fileTypeRegExp = /^image\//;
		const nameRegExp = /\..*$/;

		try {
			// Проверяем, если не картинка - исключение
			if (!fileTypeRegExp.test(file.type)) {
				throw new Error('Неверный формат файла');
			}

			// Если до этого торчала ошибка, прячем ее
			if (this.imageError.style.display === 'block') {
				this.hideError();
			}

			// Убираем расширение
			const title = file.name.replace(nameRegExp, '');

			// Заполняем необходимые поля в формдату для отправки на сервер
			const fileFormData = new FormData();
			fileFormData.append('title', title);
			fileFormData.append('image', file);

			// Включаем лоадер
			this.imageLoader.style.display = 'block';

			// Отправляем
			fetch('https://neto-api.herokuapp.com/pic/', {
				method: 'POST',
				body: fileFormData
			})
				.then((res) => {
					if (200 <= res.status && res.status < 300) {
						return res;
					}
					throw new Error(res.statusText);
				})
				.then((res) => {
					return res.json();
				})
				.then((data) => {
					// if(!this.loadedFromLink) {
					// 	this.getImageData(data.id);
					// }
					this.getImageData(data.id);
				})
				.catch((err) => {
					console.log(err);
				})

		} catch (e) {
			this.showError();
			console.log(e.message);
			return;
		}
	}

	getImageData(imageId) {
		// Если нет идентификатора - выходим
		if (!imageId) {
			return;
		}

		// Получаем данные о картинке по идентификатору
		fetch(`https://neto-api.herokuapp.com/pic/${imageId}`, {
			method: 'GET',
		})
			.then((res) => {
				if (200 <= res.status && res.status < 300) {
					return res;
				}
				throw new Error(res.statusText);
			})
			.then((res) => {
				return res.json();
			})
			.then((data) => {
				// Ппрописываем данные для отображения картинки в окне
				this.currentImage.src = data.url;
				// Создаем ссылку для меню "поделиться"
				this.shareTools.firstElementChild.value = window.location.href.replace(/\?id=.*$/, "") + "?id=" + data.id;

				this.imageId = data.id;
				this.webSocketConnection = webSocketConnection;
				this.webSocketConnection.connectToWs(this.imageId);

				setTimeout(() => {
					// Получаем данные о координатах картинки и размерах
					const imageX = this.currentImage.getBoundingClientRect().x;
					const imageY = this.currentImage.getBoundingClientRect().y;
					const imageWidth = this.currentImage.offsetWidth;
					const imageHeight = this.currentImage.offsetHeight;

					// Создаем маску с рисунками, присваиваем координаты нашего изображения
					this.loadedMask.style.position = 'absolute';
					this.loadedMask.style.left = imageX + 'px';
					this.loadedMask.style.top = imageY + 'px';

					// Отправляем данные в класс рисования, чтобы холст расположился ровно по картинке
					canvasPainting.setPosition(imageX, imageY, imageWidth, imageHeight);
				}, 1000);

			})
			.catch((err) => {
				console.log(err);
			})
			.finally(() => {
				// Отключаем лоадер
				this.imageLoader.style.display = 'none';

				// Отображаем меню
				window.history.pushState('', "", window.location.href.replace(/\?id=.*$/, "") + "?id=" + this.imageId);
				this.defaultMenuStyle();

				dragMenu.setMenuSize();
			});
	}

	defaultMenuStyle() {
		if (!this.loadedFromLink) {
			this.menuBurger.style.display = 'inline-block';
			this.menu.dataset.state = 'selected';
			this.menu.dataset.type = 'share';
			this.menuShare.dataset.state = 'selected';
		}
		else {
			this.commentClick();
		}
	}

	loadMask(mask) {
		// Отображаем маску
		this.loadedMask.src = mask;
	}

	shareClick() {
		if (this.imageError.style.display !== 'none') {
			this.hideError();
		}

		this.menuBurger.style.display = 'inline-block';
		this.menu.dataset.state = 'selected';
		this.menu.dataset.type = 'share';
		this.menuShare.dataset.state = 'selected';

		dragMenu.setMenuSize();
	}

	drawClick() {
		if (this.imageError.style.display !== 'none') {
			this.hideError();
		}

		this.menuBurger.style.display = 'inline-block';
		this.menu.dataset.state = 'selected';
		this.menu.dataset.type = 'draw';
		this.menuDraw.dataset.state = 'selected';

		// Инициализируем холст
		canvasPainting.init();
		dragMenu.setMenuSize();
	}

	commentClick() {
		if (this.imageError.style.display !== 'none') {
			this.hideError();
		}

		this.menuBurger.style.display = 'inline-block';
		this.menu.dataset.state = 'selected';
		this.menu.dataset.type = 'comment';
		this.menuComments.dataset.state = 'selected';

		// Разрешаем комментирование
		commentsHandler.startComments();
		dragMenu.setMenuSize();
	}

	menuClickHandler(event) {
		// Если меню в режиме "поделиться" реагируем на кнопку копировать
		if (event.target.classList.contains('menu_copy')) {
			const shareLink = this.shareTools.firstElementChild;

			// Выделяем текстовое поле
			shareLink.select();
			const range = document.createRange();
			range.selectNode(shareLink);
			window.getSelection().addRange(range);

			// Копируем
			try {
				// Теперь, когда мы выбрали текст ссылки, выполним команду копирования
				document.execCommand('copy');
			} catch (err) {
				console.log('Не скопировалось' + err.message);
			}

			window.getSelection().removeAllRanges();
		}

		// Если кнопка возврата, возвращаем в дефолтное состояние меню
		if (event.target.classList.contains('burger') || event.target.parentElement.classList.contains('burger')) {
			if (this.imageError.style.display !== 'none') {
				this.hideError();
			}

			this.menuBurger.style.display = 'none';
			this.menu.dataset.state = 'default';
			this.menu.dataset.type = 'default';

			// Закрываем рисование
			if (this.menuDraw.dataset.state === 'selected') {
				canvasPainting.closePaint();
			}
			// Отключаем комментирование
			if (this.menuComments.dataset.state === 'selected') {
				commentsHandler.stopComments();
			}

			// Состаяние в дефолт
			this.menuDraw.dataset.state = '';
			this.menuShare.dataset.state = '';
			this.menuComments.dataset.state = '';

			dragMenu.setMenuSize();
		}
	}

	showError() {
		this.imageError.style.display = 'block';
	}

	hideError() {
		this.imageError.style.display = 'none';
	}

	onResizeReload(event) {
		// Получаем данные о координатах картинки и размерах
		const imageX = this.currentImage.getBoundingClientRect().x;
		const imageY = this.currentImage.getBoundingClientRect().y;
		const imageWidth = this.currentImage.offsetWidth;
		const imageHeight = this.currentImage.offsetHeight;

		// Создаем маску с рисунками, присваиваем координаты нашего изображения
		this.loadedMask.style.position = 'absolute';
		this.loadedMask.style.left = imageX + 'px';
		this.loadedMask.style.top = imageY + 'px';

		canvasPainting.setPosition(imageX, imageY, imageWidth, imageHeight);
	}
}