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
		this.menuWidth = 0;
		this.menuHeight = 0;
		this.widthObj = {};

		this.menuX = 0;
	}

	registerEvents() {
		this.menu.addEventListener('mousedown', event => this.takeMenu(event));
		window.addEventListener('mousemove', event => this.moveMenu(event.pageX, event.pageY));
		window.addEventListener('mouseup', event => this.dropMenu(event));
	}

	setMenuSize() {
		// Заполняем объект шириной элементов меню
		if (!(this.menu.dataset.type in this.widthObj)) {
			this.widthObj[this.menu.dataset.type] = this.menu.offsetWidth;
		}
		else {
			// Если ширина элемента больше, чем записана перезаписываем
			if (!(this.widthObj[this.menu.dataset.type] > this.menu.offsetWidth))
				this.widthObj[this.menu.dataset.type] = this.menu.offsetWidth;
		}

		const menuWidth = this.widthObj[this.menu.dataset.type];
		const windowRight = document.querySelector('.wrap').getBoundingClientRect().right;

		// Если меню выходит за пределы окна, двигаем
		if ((this.menuX + menuWidth) > windowRight) {
			this.menu.style.left = windowRight - this.widthObj[this.menu.dataset.type] - 2 + 'px';
			this.menuX = this.menu.getBoundingClientRect().left;
		}

		this.menuWidth = this.menu.offsetWidth;
		this.menuHeight = this.menu.offsetHeight;
	}

	takeMenu(event) {
		if (event.target === this.dragElement) {
			// Назначение меню активным элементом, участвующим в перемещении
			this.activeElement = this.menu;

			// Определение границ элемента
			const bounds = event.target.getBoundingClientRect();

			// Определение границ области перемещения, 2 пикселя больше, потому что меню разваливается, если пиксель в пиксель
			this.maxX = window.innerWidth - this.menuWidth - 2;
			this.maxY = window.innerHeight - this.menuHeight - 2;
			// this.maxX = window.innerWidth - this.activeElement.offsetWidth - 2;
			// this.maxY = window.innerHeight - this.activeElement.offsetHeight - 2;

			// Определения смещения элемента относительно координат курсора
			this.shiftX = event.pageX - bounds.left - window.pageXOffset;
			this.shiftY = event.pageY - bounds.top - window.pageYOffset;
		}
	}

	moveMenu(x, y) {
		// Есть ли активный элемент, который надо двигать?
		if (this.activeElement) {
			// Перерасчет новых координат элемента
			x = x - this.shiftX;
			y = y - this.shiftY;
			x = Math.min(x, this.maxX);
			y = Math.min(y, this.maxY);
			x = Math.max(x, this.minX);
			y = Math.max(y, this.minY);

			// Присвоение свойству элемента новых координат
			this.activeElement.style.left = x + 'px';
			this.activeElement.style.top = y + 'px';
		}
	}

	dropMenu() {
		if (this.activeElement) {
			// Отпускаем элемент
			this.activeElement = null;

			this.menuX = this.menu.getBoundingClientRect().left;
		}
	}
}