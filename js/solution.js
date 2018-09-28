'use strict';
// Находим элемент добавить
const menuNew = document.querySelector('.new');

// Создаем инпут файл для загрузки картинки и прячем его
const input = document.createElement('input');
input.type = 'file';
input.accept = "image/x-png,image/jpeg";
input.style.display = 'none';
input.id = 'uploadInput';

menuNew.appendChild(input);

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
* load - загрузка данных из локалсторадж при обновлении страницы
* getStorageData - получение идентификатора изображения из локалстораджа
* save - сохранение идентификтаора изображения в локалсторадж
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
		this.load(this.getStorageData());

		// Если зашли не через ссылку из "поделиться" загружаем картинку из локалстораджа
		if(!this.loadedFromLink) {
			this.getImageData(this.imageId);
		}
		this.webSocketConnection = null;
	}

	init() {
		// Устанавливаем в окне начальное состояние
		this.menu.dataset.state = 'initial';
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
		this.container.addEventListener('drop', this.loadFile);
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

		this.inputImage.addEventListener('change', this.loadFile);
		this.menu.addEventListener('click', this.menuClickHandler);
		this.menuShare.addEventListener('click', this.shareClick);
		this.menuDraw.addEventListener('click', this.drawClick);
		this.menuComments.addEventListener('click', this.commentClick);

		window.addEventListener('beforeunload', () => {
			localStorage.clear();
		});
	}

	loadFile(e) {
		e.preventDefault();
		let file;

		// Разобрали полученный файл, есил файл уже загружен, не даем загружать новый драг-н-дропом
		if (event.currentTarget.files) {
			file = Array.from(event.currentTarget.files)[0];
		}
		else {
			if (this.menu.dataset.state === 'work') {
				bgImageLoader.errorMessage.textContent = 'Чтобы загрузить новое изображение, пожалуйста, воспользуйтесь' +
					' пунктом "Згрузить новое" в меню';
				bgImageLoader.imageError.style.display = 'block';
				return;
			}
			file = Array.from(event.dataTransfer.files)[0];
		}

		// Если получили файл отправляем его на загрузку на сервак
		if (file) {
			bgImageLoader.upLoadFile(file);
		}
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
				this.imageError.style.display = 'none';
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
					if(!this.loadedFromLink) {
						this.getImageData(data.id);
					}
				})
				.catch((err) => {
					console.log(err);
				})

		} catch (e) {
			this.imageError.style.display = 'block';
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
				this.webSocketConnection.connect(this.imageId);

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
				}, 500);

				this.save();
			})
			.catch((err) => {
				console.log(err);
			})
			.finally(() => {
				// Отключаем лоадер
				this.imageLoader.style.display = 'none';

				// Отображаем меню
				this.menuBurger.style.display = 'inline-block';
				this.menu.dataset.state = 'selected';
				this.menuShare.dataset.state = 'selected';
			});
	}

	loadMask(mask) {
		// Отображаем маску
		this.loadedMask.src = mask;

		// Очищаем холст
		canvasPainting.clearCanvas();
	}

	shareClick() {
		bgImageLoader.menuBurger.style.display = 'inline-block';
		bgImageLoader.menu.dataset.state = 'selected';
		bgImageLoader.menuShare.dataset.state = 'selected';
	}

	drawClick() {
		bgImageLoader.menuBurger.style.display = 'inline-block';
		bgImageLoader.menu.dataset.state = 'selected';
		bgImageLoader.menuDraw.dataset.state = 'selected';

		// Инициализируем холст
		canvasPainting.init();
	}

	commentClick() {
		bgImageLoader.menuBurger.style.display = 'inline-block';
		bgImageLoader.menu.dataset.state = 'selected';
		bgImageLoader.menuComments.dataset.state = 'selected';

		// Разрешаем комментирование
		commentsHandler.startComments();
	}

	menuClickHandler(event) {
		// Если меню в режиме "поделиться" реагируем на кнопку копировать
		if (event.target.classList.contains('menu_copy')) {
			const shareLink = bgImageLoader.shareTools.firstElementChild;

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
			bgImageLoader.menuBurger.style.display = 'none';
			bgImageLoader.menu.dataset.state = 'default';

			// Закрываем рисование
			if (bgImageLoader.menuDraw.dataset.state === 'selected') {
				canvasPainting.closePaint();
			}
			// Отключаем комментирование
			if (bgImageLoader.menuComments.dataset.state === 'selected') {
				commentsHandler.stopComments();
			}

			// Состаяние в дефолт
			bgImageLoader.menuDraw.dataset.state = '';
			bgImageLoader.menuShare.dataset.state = '';
			bgImageLoader.menuComments.dataset.state = '';
		}
	}

	// Присвоение идентификатора изображения
	load(value) {
		this.imageId = value || '';
	}

	// Загрузка идентификатора
	getStorageData() {
		return sessionStorage.getItem('imageId');
	}

	// Сохранение идентификатора
	save() {
		sessionStorage.imageId = this.imageId;
	}
}

/*
* Класс, отвечающий за работу комментариев
*
* Конструктор принимает контейнер, в котором лежит элемент меню "комментарии"
* commentsOn, commentsOff - элементы, отвечающие за инпут вкл/выкл комментарии
* commentsField - канвас, поле в котором можно добавлять новые комментарии
* app - элемент DOM, все окно, для добавления новых форм комментариев
* addCommentsPermission - разрешение на добавление новых комментов
*
* loadedComment:
* allCommentsDom - элементы DOM, все форма с комменариями
*	loadedCommentArr - массив разобранных объектов сообщений после загрузки
*	loadedCommentObj - объект сообщений структуры: {
*		comment: {
*			message: str,
*			timestamp: time
*		}
*		id: str,
*		info: {
*			left: int,
*			top: int
*		}
*	} полученные сообщения, разбираются в такой вид, сообщения, имеющие одни координаты, складываются в один объект,
*	но имею разный comment, новые сообщения создают новый объект и добавляюстя в массив loadedCommentArr
*	allCommentsDom - массив элементов DOM, создержащий все новые формы комментариев
*
* Функции:
* registerEvents - отвечает сама за себя
*
* init - принимает один аргумент - комментарии, загруженные по вебсокету. Функция разбирает полученные данные, создает
* массив объектов с комментариями, распределяет по окнам и координатам, отправляет почленно элементы массива на
* генерацию элементов DOM формы с полями и кнопками
*
* startComments, stopComments, switchComments
*
*	newComment - реагирует на ивент нажатия кнопки мыши по картинке, создает новый элемент формы комментария,
*	записывает данные и координаты.
*
*	newCommentSend - принимает объект формы с комментарием, отправляет данные из окна сообщений на сервер
 */
class CommentsHandler {
	constructor(container) {
		this.menuComments = container;
		this.toggleComments = this.menuComments.querySelector('.menu__toggle-bg');

		this.commentsField = null;
		this.addCommentsPermission = false;

		this.loadedCommentArr = [];
		this.loadedCommentObj = {};
		this.allCommentsDom = null;

		this.app = document.querySelector('.app');

		this.comments = [];

		if (this.comments.length !== 0) {
			this.loadComments();
		}
	}

	registerEvents() {
		// При клике по картинке добавляем нвоый коммент
		if (this.addCommentsPermission) {
			this.commentsField.addEventListener('click', this.newComment);
		}
		// Выбираем все созданные элементы формы на странице и отлавливаем клик по ним
		this.allCommentsDom = document.querySelectorAll('.comments__form');
		Array.from(this.allCommentsDom).forEach(comment => {
			comment.addEventListener('click', event => this.newCommentSend(event, comment))
		});

		this.toggleComments.addEventListener('change', event => this.switchComments(event));
	}

	init(comments) {
		this.allCommentsDom = document.querySelectorAll('.comments__form');
		Array.from(this.allCommentsDom).forEach(comment => {
			comment.addEventListener('click', event => this.newCommentSend(event, comment))
		});

		// Получение комментариев от сервера
		this.comments = comments;

		// Если комментарии получены и они есть
		if (this.comments && this.comments.length !== 0) {
			// Пробегаем по объекту с комментариями
			for (let comment in this.comments) {
				// Смотрим это самый первый комментарий или нет, исходя из данных массива объектов дял комментариев
				if (this.loadedCommentArr.length !== 0) {
					// Если да, заходим внутрь массива с комментариями
					for (let i = 0; i <= this.loadedCommentArr.length; i++) {
						// Смотрим, есть ли комментарии в массиве в окне с теми же координатами, что и новый комментарий
						if (this.loadedCommentArr[i]
							&& this.loadedCommentArr[i].info.left === this.comments[comment].left
							&& this.loadedCommentArr[i].info.top === this.comments[comment].top) {
							// Если да, создаемвременный объект для записи сообщения и времени, координаты у нас уже есть
							let newComm = {
								message: this.comments[comment].message,
								timestamp: this.comments[comment].timestamp
							};
							// Добавляем к нашему объекту новый комментарий с новым временем
							this.loadedCommentArr[i][`comment_${comment}`] = newComm;
							// Выходим из цикла
							break;
						}
						// Если мы прошли по всему массиву, такого окна с комментариями не было, создаем новый элемент массива
						// для нового окошка с новыми координатами
						else if (i === this.loadedCommentArr.length) {
							// Временный объект для нового комментария
							const ld = {};
							let commentInfo = {
								left: this.comments[comment].left,
								top: this.comments[comment].top,
							};
							// Заполняем объект
							ld.id = comment;
							ld.comment = {
								message: this.comments[comment].message,
								timestamp: this.comments[comment].timestamp
							};
							ld.info = commentInfo;

							// Добавляем в конец массива
							this.loadedCommentArr.push(ld);
							// Выходим из цикла
							break;
						}
					}
				}
				// Если комментарий первый создаем его и записываем в массив объектов с комментариями
				else {
					this.loadedCommentData = {
						message: this.comments[comment].message,
						timestamp: this.comments[comment].timestamp
					};
					let commentInfo = {
						left: this.comments[comment].left,
						top: this.comments[comment].top,
					};

					this.loadedCommentObj.id = comment;
					this.loadedCommentObj.comment = this.loadedCommentData;
					this.loadedCommentObj.info = commentInfo;

					this.loadedCommentArr.push(this.loadedCommentObj);
				}
			}

			this.loadComments();
		}

		// Выбираем все созданные элементы формы на странице и отлавливаем клик по ним
		this.registerEvents();
	}

	switchComments(event) {
		if(event.target.value === 'on') {
			Array.from(this.allCommentsDom).forEach(comment => {
				comment.style.display = 'block';
			});
		}
		else {
			Array.from(this.allCommentsDom).forEach(comment => {
				comment.style.display = 'none';
			});
		}
	}

	startComments() {
		this.addCommentsPermission = true;
		this.commentsField = document.querySelector('#drawingCanvas');

		this.registerEvents();
	}

	stopComments() {
		this.addCommentsPermission = false;
	}

	loadComments() {
		// После того, как разобрали все входящие комменты, заполненный массив пробегаем и создаем формы для комментариев
		// Проходим по массиву с объектами комментов
		this.loadedCommentArr.forEach(comment => {
			//Для каждого коммента создаем экземпляр класса, отвечающий за создание форм и заполнение комментариев
			const newComment = new CommentBlock(comment.info.left, comment.info.top,);
			// Создаем новую форму для комментариев
			newComment.newComment();

			// Заполняем ее комментариями, comment[message].message - текст коммента, comment[message].timestamp - время
			// написания
			for (let message in comment) {
				// Если текст коммента есть
				if (comment[message].message) {
					newComment.addComment(comment[message].message, comment[message].timestamp)
				}
			}
		});
	}

	newComment(event) {
		if (commentsHandler.addCommentsPermission) {
			// Если клик по картинке, знаичт создается новый коммент
			const newComment = new CommentBlock(event.pageX, event.pageY);

			newComment.newComment();
			commentsHandler.registerEvents();
		}
	}

	newCommentSend(event, comment) {
		let commentBody, commentTextarea;
		// Если комменты не только что созданный, получаем данные о нем
		if (comment) {
			commentBody = comment.querySelector('.comments__body');
			commentTextarea = comment.querySelector('.comments__input');
		}

		// Если клик по свернутому окну - разворачиваем
		if (event.target.classList.contains('comments__marker-checkbox')) {
			commentBody.style.display = 'block';
		}
		// Если клик внутри формы по кнопке закрыть - сворчиваем
		if (event.target.classList.contains('comments__close')) {
			commentBody.style.display = 'none';
		}
		// Если клик по кнопке отправить
		if (event.target.classList.contains('comments__submit')) {
			event.preventDefault();

			const loader = comment.querySelector('.loader');

			// Создаем объект для отправки на сервер
			let sentCommentData = {};
			sentCommentData.message = commentTextarea.value;
			sentCommentData.left = comment.dataset.left;
			sentCommentData.top = comment.dataset.top;

			commentTextarea.value = '';
			// Показываем лоадер
			loader.hidden = false;

			// Преобразуем данные для сервера
			const postParams = Object.keys(sentCommentData).map((key) => {
				return encodeURIComponent(key) + '=' + encodeURIComponent(sentCommentData[key]);
			}).join('&');

			// Отправка
			fetch(`https://neto-api.herokuapp.com/pic/${bgImageLoader.imageId}/comments`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
				},
				body: postParams
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
					// Прячем лоадер
					loader.hidden = true;

					// // Посик последнего добавленного коммента
					// let time = 0;
					// for (let key in data.comments) {
					// 	if (time < data.comments[key].timestamp) {
					// 		time = data.comments[key].timestamp;
					// 	}
					// }
					//
					// // Добавление коммента в существующую форму
					const addComment = new CommentBlock(sentCommentData.left, sentCommentData.top, sentCommentData.message);
					addComment.someFormOpened(comment)

				})
				.catch((err) => {
					console.log(err);
				})
		}
	}
}

/*
* CommentBlock - класс шаблонизатор. Создает новые формы с комментариями, либо доавляет комментарии к уже существующим
* constructor принимает координаты точки на экране, где был клик мышкой, дял отрисовки там иконки формы, сообщение,
* необязательный агрумент из активной в данный момент формы и саму активную форму
*
* Свойства:
* newCommentObj - объект форма с комментариями, которая создается при клике мышкой
* newCommentBody - основная часть формы, где отображаются комментарии и элементы управления
* app - элемент DOM, все окно, для добавления новых форм комментариев
* allComments - все формы комментариев в окне
* activeForm - раскрытое в данный момент окно комментариев
*
* Методы:
* newComment - метод реагирущий на клик мышкой по изображению, отвечает за создание пустой формы для комментов
* addComment - метода, отвечающий за добавления комментарев
* commentTemplate - шаблонизатор формы с комментариями, принимает объект с данными комментария и координаты
* engine - распаковщик функции шаблонизатора
*
 */
class CommentBlock {
	constructor(x, y, message = '') {
		this.x = x;
		this.y = y;
		this.message = message;

		this.newCommentObj = null;
		this.newCommentBody = null;

		this.app = document.querySelector('.app');
		this.allComments = null;
		this.activeForm = null;
	}

	someFormOpened(activeForm = null) {
		this.activeForm = activeForm;

		if(this.activeForm !== null) {
			this.activeForm.querySelector('.comments__body').style.display = 'block';
		}
	}

	newComment() {
		// Отправляем в шаблонизатор запрос на создание формы с необходиыми координатами в dataset
		const blockObj = this.commentTemplate('', Math.round(this.x), Math.round(this.y));
		this.newCommentObj = this.app.appendChild(this.engine(blockObj));

		// Создается новый элемент формы
		const commentWidth = this.newCommentObj.firstElementChild.offsetWidth;
		const commentHeight = this.newCommentObj.firstElementChild.offsetHeight;
		const formLoader = this.newCommentObj.querySelector('.comment .loader');

		// Делаем его видимым и прописываем ему координаты, в зависимости от места, куда кликнули
		this.newCommentObj.style.display = 'block';
		this.newCommentObj.style.position = 'absolute';

		// Отрисовываем новую форму на том месте, куда кликнули, центрируем
		this.newCommentObj.style.left = this.x - (commentWidth / 1.3) + 'px';
		this.newCommentObj.style.top = this.y - (commentHeight / 1.5) + 'px';

		this.newCommentBody = this.newCommentObj.querySelector('.comments__body');

		// Делаем тело формы видимым
		this.newCommentBody.style.display = 'block';
		formLoader.hidden = true;
	}

	addComment(message = '', timestamp) {
		// Получаем все элементы форм на экране
		this.allComments = document.querySelectorAll('.comments__form');

		// Если в данный момент есть открытое окно
		if (this.activeForm) {
			// Получаем необходимые элементы этого окна для добавления новых комментов
			const activeFormBody = this.activeForm.querySelector('.comments__body');
			const activeFormLoader = this.activeForm.querySelector('.comment .loader');
			const formMessage = this.activeForm.querySelector('.comment').cloneNode(true);

			// Если сообщение первое, то заполняем пустой див спецаильно подготовленный для этого
			if (formMessage.firstElementChild.textContent === '') {
				const activeFormMessage = this.activeForm.querySelector('.comment');
				activeFormMessage.firstElementChild.textContent = new Date(timestamp).toLocaleString('ru-Ru');
				activeFormMessage.firstElementChild.nextElementSibling.textContent = this.message;
			}
			// Если нет, клонируем див с сообщениями и заполняем его данными
			else {
				const addedComment = activeFormBody.insertBefore(formMessage, activeFormLoader.parentNode);
				const commentTime = addedComment.querySelector('.comment__time');
				const commentText = addedComment.querySelector('.comment__message');

				// Заполняем его данными
				commentTime.textContent = new Date(timestamp).toLocaleString('ru-Ru');
				commentText.textContent = this.message;
			}

			activeFormBody.style.display = 'none';
		}

		// Если активного окна нет, либо это обновление страницы и подгрузка комментариев
		else {
			// Пробегаем по элементам форм
			Array.from(this.allComments).forEach(commentForm => {
				// Находим интересующую нас форму с нужными координатами и заполняем её
				if (Number(commentForm.dataset.left) === this.x && Number(commentForm.dataset.top) === this.y) {
					const activeFormBody = commentForm.querySelector('.comments__body');
					const activeFormLoader = commentForm.querySelector('.comment .loader');
					const formMessage = commentForm.querySelector('.comment').cloneNode(true);

					// Если сообщение первое, то заполняем пустой див спецаильно подготовленный для этого
					if (formMessage.firstElementChild.textContent === '') {
						const activeFormMessage = commentForm.querySelector('.comment');
						activeFormMessage.firstElementChild.textContent = new Date(timestamp).toLocaleString('ru-Ru');
						activeFormMessage.firstElementChild.nextElementSibling.textContent = message;
					}
					// Если нет, клонируем див с сообщениями и заполняем его данными
					else {
						const addedComment = activeFormBody.insertBefore(formMessage, activeFormLoader.parentNode);
						const commentTime = addedComment.querySelector('.comment__time');
						const commentText = addedComment.querySelector('.comment__message');

						// Заполняем его данными
						commentTime.textContent = new Date(timestamp).toLocaleString('ru-Ru');
						commentText.textContent = message;
					}

					activeFormBody.style.display = 'none';
				}


			});

			// Если активного окна с сообщениями в данный момент нет, все формы скрыты
		}
	}

	commentTemplate() {
		return {
			tag: 'form',
			cls: 'comments__form',
			attrs: {'data-left': this.x, 'data-top': this.y},
			content: [
				{
					tag: 'span',
					cls: 'comments__marker'
				},
				{
					tag: 'input',
					cls: 'comments__marker-checkbox',
					attrs: {type: 'checkbox'}
				},
				{
					tag: 'div',
					cls: 'comments__body',
					content: [
						{
							tag: 'div',
							cls: 'comment',
							content: [
								{
									tag: 'p',
									cls: 'comment__time',
									content: ''
								},
								{
									tag: 'p',
									cls: 'comment__message',
									content: ''
								}
							]
						},
						{
							tag: 'div',
							cls: 'comment',
							content: [
								{
									tag: 'div',
									cls: 'loader',
									content: [
										{
											tag: 'span'
										},
										{
											tag: 'span'
										},
										{
											tag: 'span'
										},
										{
											tag: 'span'
										},
										{
											tag: 'span'
										},
									]
								}
							]
						},
						{
							tag: 'textarea',
							cls: 'comments__input',
							attrs: {type: 'button', placeholder: 'Напишите ответ...'}
						},
						{
							tag: 'input',
							cls: 'comments__close',
							attrs: {type: 'button', value: 'Закрыть'}
						},
						{
							tag: 'input',
							cls: 'comments__submit',
							attrs: {type: 'submit', value: 'Отправить'}
						}
					]
				}
			]
		}
	}

	engine(block) {
		if (!block) {
			return document.createTextNode('');
		}

		if ((typeof block === 'string') || (typeof block === 'number') || (typeof block === true)) {
			return document.createTextNode(block);
		}

		if (Array.isArray(block)) {
			return block.reduce((f, item) => {
				f.appendChild(this.engine(item));
				return f;
			}, document.createDocumentFragment(block.tag))
		}

		const element = document.createElement(block.tag || 'div');
		element.classList.add(...[].concat(block.cls || []));

		if (block.attrs) {
			Object.keys(block.attrs).forEach(key => {
				element.setAttribute(key, block.attrs[key])
			})
		}

		if (block.content) {
			element.appendChild(this.engine(block.content))
		}
		return element;
	}
}

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

		// Пробегаем по массиву, после каждого прохода удаляется первый элемент массива, таким образом соблюдается
		// последовательность отправки данных на свервер
		this.curves.forEach(curve => {
			this.drawingCanvas.toBlob(blob => {
				webSocketConnection.sendImageBlob(blob);
			});
		});
	}

	clearCanvas() {
		// Удаление первого элемента массива, который был успешно отправлен только что
		this.curves.shift();

		// Через секунду  после получения ответа с сервера чистим холст, чтобы не было такого явного мерцания рисования
		setTimeout(() => {
			this.drawingCtx.clearRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
			this.curves.shift();
		}, 1000)
	}
}

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
	}

	registerEvents() {
		this.socketConnection.addEventListener('open', event => this.connectionOpen(event));
		this.socketConnection.addEventListener('message', event => this.messageRecieved(event));
		this.socketConnection.addEventListener('error', event => this.errorLog(event));
	}

	connect(imageId) {
		this.socketConnection = new WebSocket(`wss://neto-api.herokuapp.com/pic/${imageId}`);

		this.registerEvents();
	}

	connectionOpen() {
		console.log('Соединение открыто');
	}

	messageRecieved(event) {
		const recievedData = JSON.parse(event.data);

		if (recievedData.event === 'pic') {
			commentsHandler.init(recievedData.pic.comments);

			if (recievedData.pic.mask) {
				bgImageLoader.loadMask(recievedData.pic.mask);
			}
		}

		if (recievedData.event === 'mask') {
			bgImageLoader.loadMask(recievedData.url);
		}

		if(recievedData.event === 'comment') {
			const addComment = new CommentBlock(recievedData.comment.left, recievedData.comment.top, recievedData.comment.message);
			addComment.addComment(recievedData.comment.message, recievedData.comment.timestamp);
		}
	}

	sendImageBlob(blob) {
		this.socketConnection.send(blob);
	}

	errorLog(event) {
		console.log(event.data);
	}
}

/*
* Класс, отвечающий за движение меню
*
* Конструктор принимает контейнер, в котором лежи элемент меню
* dragElement - элемент, при нажатии на который можно двигать меню
* activeElement - элемент, захватываемый при нажатии кнопки мыши
* shiftX, shiftY - границы элемента, который двигаем
* minX, minY, maxX, maxY - границы области, за которую нельзя заходить, при движении элемента
*
* Функции:
* registerEvents - отвечает сама за себя
*
* takeMenu - реагирует на нажатии кнопки мыши, проверяет, на каком элементе был клик, захватывает элемент, определяет
* границы элемента и границы области движения.
*
* dragMenu - принимает координаты движения курсора, реагирует на движение мыши, перемещает меню
*
* dropMenu - реагирует на отпускание кнопки мыши, убирает активный элемент.
*/
class DragMenu {
	constructor(container) {
		this.menu = container;
		this.dragElement = container.querySelector('.drag');

		this.activeElement = null;
		this.shiftX = 0;
		this.shiftY = 0;
		this.minX = 0;
		this.minY = 0;
		this.maxX = window.innerWidth;
		this.maxY = window.innerHeight;
	}

	registerEvents() {
		this.menu.addEventListener('mousedown', this.takeMenu);
		window.addEventListener('mousemove', event => this.dragMenu(event.pageX, event.pageY));
		window.addEventListener('mouseup', this.dropMenu);
	}

	takeMenu(event) {
		if (event.target === dragMenu.dragElement) {
			// Назначение меню активным элементом, участвующим в перемещении
			dragMenu.activeElement = dragMenu.menu;

			// Определение границ элемента
			const bounds = event.target.getBoundingClientRect();

			// Определение границ области перемещения, 2 пикселя больше, потому что меню разваливается, если пиксель в пиксель
			dragMenu.maxX = window.innerWidth - dragMenu.activeElement.offsetWidth - 2;
			dragMenu.maxY = window.innerHeight - dragMenu.activeElement.offsetHeight - 2;

			// Определения смещения элемента относительно координат курсора
			dragMenu.shiftX = event.pageX - bounds.left - window.pageXOffset;
			dragMenu.shiftY = event.pageY - bounds.top - window.pageYOffset;
		}
	}

	dragMenu(x, y) {
		// Есть ли активный элемент, который надо двигать?
		if (dragMenu.activeElement) {
			// Перерасчет новых координат элемента
			x = x - dragMenu.shiftX;
			y = y - dragMenu.shiftY;
			x = Math.min(x, dragMenu.maxX);
			y = Math.min(y, dragMenu.maxY);
			x = Math.max(x, dragMenu.minX);
			y = Math.max(y, dragMenu.minY);

			// Присвоение свойству элемента новых координат
			dragMenu.activeElement.style.left = x + 'px';
			dragMenu.activeElement.style.top = y + 'px';
		}
	}

	dropMenu() {
		if (dragMenu.activeElement) {
			// Отпускаем элемент
			dragMenu.activeElement = null;
		}
	}
}

const bgImageLoader = new BgImageLoader(document.querySelector('.wrap'));
const dragMenu = new DragMenu(document.querySelector('.menu'));
const commentsHandler = new CommentsHandler(bgImageLoader.commentsTools);
const canvasPainting = new CanvasPainting(bgImageLoader.drawTools);
const webSocketConnection = new WebSocketConnection();

canvasPainting.create();
dragMenu.registerEvents();


function throttle(callback) {
	let isWaiting = false;
	return function () {
		if (!isWaiting) {
			callback.apply(this, arguments);
			isWaiting = true;
			requestAnimationFrame(() => {
				isWaiting = false;
			});
		}
	}
}

