'use strict';

const currentImage = document.querySelector('.current-image');
const commentForm = document.querySelector('.comments__form');
const menu = document.querySelector('.menu');
const menuBurger = menu.querySelector('.burger');
const menuNew = menu.querySelector('.new');

const input = document.createElement('input');
input.type = 'file';
input.accept = "image/x-png,image/jpeg";
input.style.position = 'absolute';
input.style.left = '-999px';
input.id = 'uploadInput';

menuNew.appendChild(input);

function init() {
	currentImage.src = '';
	commentForm.style.display = 'none';

	menu.dataset.state = 'initial';
	menuBurger.style.display = 'none';
}

window.addEventListener('DOMContentLoaded', init);

class BgImageLoader {
	constructor( container, storageKey = '_text-editor__content' ) {
		this.container = container;
		this.currentImage = container.querySelector( '.current-image' );
		this.inputImage = container.querySelector('#uploadInput');
		this.imageLoader = container.querySelector('.image-loader');
		this.imageError = container.querySelector('.error');
		this.errorMessage = container.querySelector('.error__message');

		this.menuShare = container.querySelector('.share');
		this.shareTools = container.querySelector('.share-tools');

		this.menuDraw = container.querySelector('.draw');
		this.menuComments = container.querySelector('.comments');
		// this.filenameContainer = container.querySelector( '.text-editor__filename' );
		// this.storageKey = storageKey;
		this.registerEvents();
		this.load( this.getStorageData());
	}
	registerEvents() {
		// const save = throttle( this.save.bind( this ), 1000 );
		// this.contentContainer.addEventListener( 'input', save );
		this.container.addEventListener('drop', this.loadFile);
		this.container.addEventListener('dragover', this.showHint);
		menuNew.addEventListener('click', event => {
			event.preventDefault();

			const newEvent = new MouseEvent(event.type, event);
			this.inputImage.dispatchEvent(newEvent);
		});
		this.inputImage.addEventListener('click', event => {
			event.stopPropagation();
		});
		this.inputImage.addEventListener('change', this.loadFile)

	}

	loadFile( e ) {
		e.preventDefault();
		let file;

		if(event.currentTarget.files) {
			file = Array.from(event.currentTarget.files)[0];
		}
		else {
			if(menu.dataset.state === 'work') {
				bgImageLoader.errorMessage.textContent = 'Чтобы загрузить новое изображение, пожалуйста, воспользуйтесь' +
					' пунктом "Згрузить новое" в меню';
				bgImageLoader.imageError.style.display = 'block';
				return;
			}
			file = Array.from(event.dataTransfer.files)[0];
		}

		if(file) {
			bgImageLoader.upLoadFile(file);
		}
	}

	upLoadFile( file ) {
		const fileTypeRegExp = /^image\//;
		const nameRegExp = /\..*$/;

		try {
			if(!fileTypeRegExp.test(file.type)) {
				throw new Error ('Неверный формат файла');
			}

			if(this.imageError.style.display === 'block') {
				this.imageError.style.display = 'none';
			}

			// Убираем расширение
			const title = file.name.replace(nameRegExp, '');

			const fileFormData = new FormData();
			fileFormData.append('title', title);
			fileFormData.append('image', file);

			this.imageLoader.style.display = 'block';

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
					// console.log(data);
					this.getImageData(data);
				})
				.catch((err) => {
					console.log(err);
				})

		}catch (e) {
			this.imageError.style.display = 'block';
			console.log(e.message);
			return;
		}
	}

	getImageData(data) {
		// console.log(data);

		fetch(`https://neto-api.herokuapp.com/pic/${data.id}`, {
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
				console.log(data);
				this.currentImage.src = data.url;
				this.shareTools.firstElementChild.value = data.url;
			})
			.catch((err) => {
				console.log(err);
			})
			.finally(() => {
				this.imageLoader.style.display = 'none';
				menuBurger.style.display = 'inline-block';
				menu.dataset.state = 'selected';

				this.menuShare.dataset.state = 'selected';
			});
	}
	uploadButtonEmit(event) {
		// inputFile.addEventListener('change', BgImageLoader.loadFile);
	}
	setFilename( filename ) {
	}
	showHint( e ) {
		e.preventDefault();
	}
	hideHint() {
	}
	load( value ) {
	}
	getStorageData() {
		// return localStorage[ this.storageKey ];
	}
	save() {
		// localStorage[ this.storageKey ] = this.contentContainer.value;
	}
}

const bgImageLoader = new BgImageLoader(document.querySelector('.wrap'));