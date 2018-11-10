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

		this.addComment = null;
		this.oldComment = null;

		if (this.comments.length !== 0) {
			this.loadComments();
		}
	}

	registerEvents() {
		// При клике по картинке добавляем нвоый коммент
		if (this.addCommentsPermission) {
			this.commentsField.addEventListener('click', this.newComment);
		}

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
		if (event.target.value === 'on') {
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

			const imageX = bgImageLoader.currentImage.getBoundingClientRect().x;
			const imageY = bgImageLoader.currentImage.getBoundingClientRect().y;

			const newComment = new CommentBlock(event.pageX - imageX, event.pageY - imageY);

			newComment.newComment();
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

			if (this.oldComment) {
				this.oldComment.querySelector('.comments__body').style.display = 'none';
			}

			this.oldComment = comment;
		}

		// Если клик внутри формы по кнопке закрыть - сворчиваем
		if (event.target.classList.contains('comments__close')) {
			commentBody.style.display = 'none';

			this.oldComment = null;
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

			this.addComment = new CommentBlock(sentCommentData.left, sentCommentData.top, sentCommentData.message);
			this.addComment.someFormOpened(comment);

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
				})
				.catch((err) => {
					console.log(err);
				})
		}
	}
}