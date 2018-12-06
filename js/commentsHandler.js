/*
* Класс, отвечающий за работу комментариев
*
* Конструктор принимает контейнер, в котором лежит элемент меню "комментарии"
* toggleComments - переключатель "скрыть-показать комменты"
* commentsField - канвас, поле в котором можно добавлять новые комментарии
* app - элемент DOM, все окно, для добавления новых форм комментариев
* addCommentsPermission - разрешение на добавление новых комментов
*
* loadedComment:
* allCommentsDom - элементы DOM, все форма с комменариями
*	loadedCommentArr - массив разобранных объектов сообщений после загрузки
*	объект сообщений структуры: {
*   id: number,
*   left: number,
*   top: number,
*   messageInfo: [
*     message: '',
*     timestamp: timestamp
*   ]
*	}
*	полученные сообщения, разбираются в такой вид, сообщения, имеющие одни координаты, складываются в один объект,
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
* addNewComment - получает сообщение или массив сообщений, разбирает его и добавляет в массив класса, отправляет на
 * прорисовку
* startComments, stopComments - разрешает, запрещает добавлять комментарии
*
* switchComments - прячет, показывает комментарии
*
*	newComment - реагирует на ивент нажатия кнопки мыши по картинке, создает новый элемент формы комментария,
*	записывает данные и координаты.
 */

class CommentsHandler {
  constructor(container) {
    this.toggleComments = container.querySelector('.menu__toggle-bg');
    this.commentsField = null;
    this.addCommentsPermission = false;

    this.loadedCommentArr = [];
    this.newObjFlag = true;
    this.allCommentsDom = null;

    this.app = document.querySelector('.app');

    this.comments = [];
    this.oldComment = null;
  }

  registerEvents() {
    // При клике по картинке добавляем нвоый коммент
    if (this.addCommentsPermission) {
      this.commentsField.addEventListener('click', this.newComment);
    }

    // Прячем, показываем комменты
    this.toggleComments.addEventListener('change', event => this.switchComments(event));
  }

  // Вызывается после получения get запроса при первой загрузке страницы
  init(comments) {
    // Пробегаем по массиву сообещний и по одному отправляем в метод разбора сообщений
    for (let comment in comments) {
      this.addNewComment(comments[comment]);
    }

    // После обработки всего массива, полученный массив с разобранным сообщениями отправляем в шаблонизатор для
    // отрисовки форм
    this.loadedCommentArr.forEach(comment => {
      commentTemplate.newComment(comment.left, comment.top, comment.id, comment.commentInfo);
    });

    // Затем для заполнения сообщениями
    commentTemplate.addComment(this.loadedCommentArr);
  }

  // Разбор новых сообщений, запись их в объект и заполнения массива сообщениями
  addNewComment(comment, wsFlag) {
    // разбираем сообщение по переменным и записывыем их в обект
    const commentId = comment.left.toString() + comment.top.toString();
    const commentMessage = comment.message;
    const commentTimestamp = comment.timestamp;
    const commentLeft = comment.left;
    const commentTop = comment.top;

    let loadedCommentObj = {
      id: commentId,
      left: commentLeft,
      top: commentTop,
      commentInfo: []
    };

    const commentInfoObj = {
      message: commentMessage,
      timestamp: commentTimestamp
    };

    loadedCommentObj.commentInfo.push(commentInfoObj);

    // Пробегаем по массиву сообщений, смотрим, если уже есть сообщения с этим идентификатором, дополняем, если нет,
    // ставим флаг, что новое сообщение
    for (let el in this.loadedCommentArr) {
      if (this.loadedCommentArr[el].id === loadedCommentObj.id) {
        this.loadedCommentArr[el].commentInfo.push(commentInfoObj);
        this.newObjFlag = false;
        break;
      } else {
        this.newObjFlag = true;
      }
    }

    // Если новое сообщение или массив пуст, пушим в массив новый элемент
    if (this.newObjFlag || this.loadedCommentArr.length === 0) {
      this.loadedCommentArr.push(loadedCommentObj);
    }

    // Если флаг, что сообщение пришло из вебсокета, смотрим, если новое, создаем новое окно формы, дальше заполняем
    // сообщениями
    if(wsFlag) {
      if(this.newObjFlag) {
        commentTemplate.newComment(loadedCommentObj.left, loadedCommentObj.top, loadedCommentObj.id, loadedCommentObj.commentInfo);
      }

      commentTemplate.addCurrentComment(loadedCommentObj);
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

  switchComments(event) {
    this.allCommentsDom = document.querySelectorAll('.comments__form');

    if (event.target.value === 'on') {
      Array.from(this.allCommentsDom).forEach(comment => {
        comment.style.display = 'block';
      });
    } else {
      Array.from(this.allCommentsDom).forEach(comment => {
        comment.style.display = 'none';
      });
    }
  }

  newComment(event) {
    if (commentsHandler.addCommentsPermission) {
      // Если клик по картинке, знаичт создается новый коммент

      const imageX = bgImageLoader.currentImage.getBoundingClientRect().x;
      const imageY = bgImageLoader.currentImage.getBoundingClientRect().y;

      // const newComment = new CommentBlock(event.pageX - imageX, event.pageY - imageY);
      commentTemplate.newComment(event.pageX - imageX, event.pageY - imageY);
    }
  }
}