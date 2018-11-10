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

		this.commentWidth = null;
		this.commentHeight = null;

		this.app = document.querySelector('.app');
		this.allComments = null;
		this.activeForm = null;

		window.addEventListener('resize', () => this.replaceForms());
	}

	someFormOpened(activeForm = null) {
		this.activeForm = activeForm;

		if (this.activeForm !== null) {
			this.activeForm.querySelector('.comments__body').style.display = 'block';
		}
	}

	newComment() {
		// Отправляем в шаблонизатор запрос на создание формы с необходиыми координатами в dataset
		const blockObj = this.commentTemplate();
		this.newCommentObj = this.app.appendChild(this.engine(blockObj));

		// Создается новый элемент формы
		this.commentWidth = this.newCommentObj.firstElementChild.offsetWidth;
		this.commentHeight = this.newCommentObj.firstElementChild.offsetHeight;
		const formLoader = this.newCommentObj.querySelector('.comment .loader');

		// Делаем его видимым и прописываем ему координаты, в зависимости от места, куда кликнули
		this.newCommentObj.style.display = 'block';
		this.newCommentObj.style.position = 'absolute';

		this.setCommentPosition();

		this.newCommentBody = this.newCommentObj.querySelector('.comments__body');

		// Делаем тело формы видимым
		this.newCommentBody.style.display = 'block';

		if (commentsHandler.oldComment) {
			commentsHandler.oldComment.querySelector('.comments__body').style.display = 'none';
		}

		formLoader.hidden = true;

		this.newCommentObj.addEventListener('click', event => commentsHandler.newCommentSend(event, this.newCommentObj));

		this.newCommentObj.querySelector('.comments__close').addEventListener('click', (event) => {
			if (event.target.parentElement.querySelector('.comment__time').textContent === '') {
				this.app.removeChild(this.newCommentObj);
				commentsHandler.oldComment = null;
			}
			else {
				commentsHandler.newCommentSend(event, this.newCommentObj);
			}
		});

		this.newCommentObj.querySelector('.comments__submit').addEventListener('click', (event) => {
			if (event.target.parentElement.querySelector('.comment__time').textContent === '') {
				commentsHandler.newCommentSend(event, event.target.parentElement.parentElement);
			}
		})
	}

	setCommentPosition() {
		const imageX = bgImageLoader.currentImage.getBoundingClientRect().x;
		const imageY = bgImageLoader.currentImage.getBoundingClientRect().y;

		// Отрисовываем новую форму на том месте, куда кликнули, центрируем
		this.newCommentObj.style.left = this.x + imageX - (this.commentWidth / 1.3) + 'px';
		this.newCommentObj.style.top = this.y + imageY - (this.commentHeight / 1.5) + 'px';
	}

	replaceForms() {
		this.allComments = document.querySelectorAll('.comments__form');
		const imageX = bgImageLoader.currentImage.getBoundingClientRect().x;
		const imageY = bgImageLoader.currentImage.getBoundingClientRect().y;

		Array.from(this.allComments).forEach(commentForm => {
			commentForm.style.left = Number(commentForm.dataset.left) + imageX - (this.commentWidth / 1.3) + 'px';
			commentForm.style.top = Number(commentForm.dataset.top) + imageY - (this.commentHeight / 1.5) + 'px';
		})
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
				// activeFormMessage.firstElementChild.nextElementSibling.textContent = this.message;

				if (message.split('\n').length > 1) {
					const stringsArr = message.split('\n');
					for (let i = 0; i < message.split('\n').length; i++) {
						if (i === 0) {
							activeFormMessage.firstElementChild.nextElementSibling.textContent = stringsArr[i];
						}
						else {
							const newString = document.createElement('p');
							newString.classList.add('comment__message');
							newString.style.wordWrap = 'break-word';
							activeFormMessage.appendChild(newString);

							newString.textContent = stringsArr[i];
						}
					}
				}
				else {
					activeFormMessage.firstElementChild.nextElementSibling.textContent = message;
				}
			}
			// Если нет, клонируем див с сообщениями и заполняем его данными
			else {
				const newDiv = document.createElement('div');
				const commentTime = document.createElement('p');
				const commentText = document.createElement('p');

				newDiv.classList.add('comment');
				commentTime.classList.add('comment__time');
				commentText.classList.add('comment__message');

				newDiv.appendChild(commentTime);
				newDiv.appendChild(commentText);

				activeFormBody.insertBefore(newDiv, activeFormLoader.parentNode);

				// Заполняем его данными
				commentTime.textContent = new Date(timestamp).toLocaleString('ru-Ru');
				commentText.style.wordWrap = 'break-word';
				// commentText.textContent = this.message;

				if (message.split('\n').length > 1) {
					const stringsArr = message.split('\n');
					for (let i = 0; i < message.split('\n').length; i++) {
						if (i === 0) {
							commentText.textContent = stringsArr[i];
						}
						else {
							const newString = document.createElement('p');
							newString.classList.add('comment__message');
							newString.style.wordWrap = 'break-word';
							commentText.parentNode.appendChild(newString);

							newString.textContent = stringsArr[i];
						}
					}
				}
				else {
					commentText.textContent = message;
				}
			}
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

						if (message.split('\n').length > 1) {
							const stringsArr = message.split('\n');
							for (let i = 0; i < message.split('\n').length; i++) {
								if (i === 0) {
									activeFormMessage.firstElementChild.nextElementSibling.textContent = stringsArr[i];
								}
								else {
									const newString = document.createElement('p');
									newString.classList.add('comment__message');
									newString.style.wordWrap = 'break-word';
									activeFormMessage.appendChild(newString);

									newString.textContent = stringsArr[i];
								}
							}
						}
						else {
							activeFormMessage.firstElementChild.nextElementSibling.textContent = message;
						}
					}
					// Если нет, клонируем див с сообщениями и заполняем его данными
					else {
						const newDiv = document.createElement('div');
						const commentTime = document.createElement('p');
						const commentText = document.createElement('p');

						newDiv.classList.add('comment');
						commentTime.classList.add('comment__time');
						commentText.classList.add('comment__message');

						newDiv.appendChild(commentTime);
						newDiv.appendChild(commentText);

						activeFormBody.insertBefore(newDiv, activeFormLoader.parentNode);

						// Заполняем его данными
						commentTime.textContent = new Date(timestamp).toLocaleString('ru-Ru');
						commentText.style.wordWrap = 'break-word';

						if (message.split('\n').length > 1) {
							const stringsArr = message.split('\n');
							for (let i = 0; i < message.split('\n').length; i++) {
								if (i === 0) {
									commentText.textContent = stringsArr[i];
								}
								else {
									const newString = document.createElement('p');
									newString.classList.add('comment__message');
									newString.style.wordWrap = 'break-word';
									commentText.parentNode.appendChild(newString);


									newString.textContent = stringsArr[i];
								}
							}
						}
						else {
							commentText.textContent = message;
						}
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
			attrs: {'data-left': Math.round(this.x), 'data-top': Math.round(this.y)},
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