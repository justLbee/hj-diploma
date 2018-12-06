/*
* CommentBlock - класс шаблонизатор. Создает новые формы с комментариями, либо доавляет комментарии к уже существующим
* constructor принимает координаты точки на экране, где был клик мышкой, дял отрисовки там иконки формы, сообщение,
* необязательный агрумент из активной в данный момент формы и саму активную форму
*
* Свойства:
* newCommentObj - объект форма с комментариями, которая создается при клике мышкой
* app - элемент DOM, все окно
* allComments - все формы комментариев в окне
* activeForm - раскрытое в данный момент окно комментариев
* commentsArr - массив созданных окон комментариев, для пробега по ним и добавления новых в нужные
* commentWidth, commentHeight - размеры иконки коммента, для более точной отрисовки его в окне по координатам клика
*
* Методы:
* newComment - метод отвечает за создание пустой формы для комментов
* commentClickButtonHandler - отслеживает события клика по окну комментария
* closeComment - отвечает за закрытия окна комментария
* sendComment - отправка комментария на сервер
* setCommentPosition - выставление иконки комментария по координатам при перезагрузке
* addComment - метод, отвечающий за добавления комментарев
* addCurrentComment - добавление комментария в окне, которое в данный момент открыто
* addCommentHandler - шаблонизатор, создающий элементы комментария и заполнение их текстом
* commentTemplate - шаблонизатор формы с комментариями, принимает объект с данными комментария и координаты
* engine - распаковщик функции шаблонизатора
*
 */
let oldComment;

class CommentBlock {
  constructor() {
    this.newCommentObj = null;
    this.commentsArr = [];

    this.commentWidth = null;
    this.commentHeight = null;

    this.app = document.querySelector('.app');
    this.allComments = null;

    window.addEventListener('resize', () => this.replaceForms());
  }

  // Создаем окно сообщений
  newComment(x, y, id, message) {
    let duplicate = false;
    // Проверяем на дубликаты окон сообщений, которые уже есть
    if (this.commentsArr.length !== 0 && id) {
      this.commentsArr.find(commentForm => {
        if (commentForm.dataset.id === 'undefined') {
          commentForm.dataset.id = id;
        }

        if (commentForm.dataset.id === id) {
          duplicate = true;
        }
      });
    }

    // Проверка при клике на пустое окно, если ли выбранное и открытое окно комментариев, если да, то вызывает
    // закрытие этого комментария
    if (oldComment && !message) {
      this.closeComment(oldComment);
    }

    // Если нет дубликатов формы, создаем новую форму сообщений
    if(!duplicate) {
      // Отправляем в шаблонизатор запрос на создание формы с необходиыми координатами в dataset
      const blockObj = this.commentTemplate(id, x, y);
      this.newCommentObj = this.app.appendChild(this.engine(blockObj));

      // Создается новый элемент формы
      this.commentWidth = this.newCommentObj.firstElementChild.offsetWidth;
      this.commentHeight = this.newCommentObj.firstElementChild.offsetHeight;
      const formLoader = this.newCommentObj.querySelector('.comment .loader');

      // Делаем его видимым и прописываем ему координаты, в зависимости от места, куда кликнули
      this.newCommentObj.style.display = 'block';
      this.newCommentObj.style.position = 'absolute';

      this.setCommentPosition(x, y);

      formLoader.hidden = true;
      this.commentsArr.push(this.newCommentObj);

      if (!message) {
        this.newCommentObj.querySelector('.comments__body').style.display = 'block';
        oldComment = this.newCommentObj;
      }

      // Добавляем слушателя на только что созданную форму сообщений
      this.newCommentObj.addEventListener('click', (event) => {
        this.commentClickButtonHandler(event);
      });
    }
  }

  // Слушаем события в окнах сообщений
  commentClickButtonHandler(event) {
    event.preventDefault();
    // При клике на форму - раскрываем ее
    event.currentTarget.querySelector('.comments__body').style.display = 'block';

    // Если при клике на новую форму есть уже открытый, вызываем закрытие старого
    if (event.target.classList.contains('comments__marker-checkbox') && oldComment) {
      this.closeComment(oldComment, event.currentTarget);
    }

    if (event.target.value === 'Закрыть') {
      this.closeComment(event.currentTarget);
      return;
    }

    if (event.target.value === 'Отправить') {
      this.sendComment(event.currentTarget);
      return;
    }

    oldComment = event.currentTarget;
  }

  // Закрываем окно сообщений, первый аргумент форма, которая была открыта до этого, второй - форма, которая была
  // открыта сейчас
  closeComment(comment, newComment = null) {
    // Если они совпадают, ничего не делать
    if(comment === newComment) {
      return;
    }

    // Если открытое окно пустое, новое сообщение, и его закрыть, оно удаляется, если нет - то просто закрывается
    if (comment && !comment.querySelector('.comment__time')) {
      this.app.removeChild(oldComment);

      oldComment = null;
    } else {
      comment.querySelector('.comments__body').style.display = 'none';

      oldComment = null;
    }
  }

  sendComment(comment) {
    // Создаем объект для отправки на сервер
    let sentCommentData = {};
    const commentTextarea = comment.querySelector('.comments__input');
    const loader = comment.querySelector('.loader');

    // Собираем данные для отправки на сервер в нужный вид
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
      })
      .catch((err) => {
        console.log(err);
      });
    if (commentsHandler.oldComment) {
      commentsHandler.oldComment.querySelector('.comments__body').style.display = 'none';
    }
  }

  // Выставляем нужную позицию комментариев при загрузке страницы
  setCommentPosition(x, y) {
    const imageX = bgImageLoader.currentImage.getBoundingClientRect().x;
    const imageY = bgImageLoader.currentImage.getBoundingClientRect().y;

    // Отрисовываем новую форму на том месте, куда кликнули, центрируем
    this.newCommentObj.style.left = x + imageX - (this.commentWidth / 1.3) + 'px';
    this.newCommentObj.style.top = y + imageY - (this.commentHeight / 1.5) + 'px';
  }

  // Перемещаем комменты, при изменении размеров окна
  replaceForms() {
    this.allComments = document.querySelectorAll('.comments__form');
    const imageX = bgImageLoader.currentImage.getBoundingClientRect().x;
    const imageY = bgImageLoader.currentImage.getBoundingClientRect().y;

    Array.from(this.allComments).forEach(commentForm => {
      commentForm.style.left = Number(commentForm.dataset.left) + imageX - (this.commentWidth / 1.3) + 'px';
      commentForm.style.top = Number(commentForm.dataset.top) + imageY - (this.commentHeight / 1.5) + 'px';
    });
  }

  // Добавляем комментарии из массива комментов
  addComment(comment) {
    // Если наш массив с созданными формами комментов не пуст, пробегаем по нему, сравниваем идентификаторы окон
    // комментов и комментов, что пришли в аргументе, если совпадают добавляем в нужную форму этот коммент
    if (this.commentsArr.length !== 0) {
      this.commentsArr.forEach(commentForm => {
        if (Array.isArray(comment)) {
          comment.forEach(el => {
            if (commentForm.dataset.id === el.id) {
              if (el.commentInfo.length !== 0) {
                el.commentInfo.forEach(comment => {
                  this.addCommentHandler(commentForm, comment);
                })
              }
            }
          });
        }
      })
    }
  }

  // Добавляем комментарии из объекта, когда приходят единичные комменты из вебсокета
  addCurrentComment(commentObj) {
    if (this.commentsArr.length !== 0) {
      this.commentsArr.forEach(commentForm => {
        if (commentForm.dataset.id === 'undefined') {
          commentForm.dataset.id = commentObj.id;
        }

        if (commentForm.dataset.id === commentObj.id) {
          if (commentObj.commentInfo.length !== 0) {
            commentObj.commentInfo.forEach(el => {
              this.addCommentHandler(commentForm, el);
            })
          }
        }
      })
    }
  }

  // Создаем внутренние элементы формы комментов, для добавления новыых сообщений
  addCommentHandler(commentForm, comment) {
    const commentBody = commentForm.querySelector('.comments__body');
    const commentLoader = commentForm.querySelector('.loader');

    const newMessage = document.createElement('div');
    const newTime = document.createElement('p');
    const newText = document.createElement('p');

    newMessage.classList.add('comment');
    newTime.classList.add('comment__time');
    newText.classList.add('comment__message');
    newText.style.wordWrap = 'break-word';

    newMessage.appendChild(newTime);
    newMessage.appendChild(newText);

    commentBody.insertBefore(newMessage, commentLoader.parentNode);

    if (comment.message.split('\n').length > 1) {
      const stringsArr = comment.message.split('\n');
      for (let i = 0; i < comment.message.split('\n').length; i++) {
        if (i === 0) {
          newText.textContent = stringsArr[i];
        } else {
          const newString = document.createElement('p');
          newString.classList.add('comment__message');
          newString.style.wordWrap = 'break-word';
          newMessage.appendChild(newString);

          newString.textContent = stringsArr[i];
        }
      }
    }
    else {
      newText.textContent = comment.message;
    }

    newTime.textContent = new Date(comment.timestamp).toLocaleString('ru-Ru');
  }

  commentTemplate(id, left, top) {
    return {
      tag: 'form',
      cls: 'comments__form',
      attrs: {'data-id': id, 'data-left': Math.round(left), 'data-top': Math.round(top)},
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

