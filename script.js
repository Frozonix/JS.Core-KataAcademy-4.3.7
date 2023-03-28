class Storage {
   static items;
   constructor(idTarget, collection) {
      try {
         if (Storage.items[idTarget[idTarget.length - 1] - 1][0] !== undefined) {
            this.id = localStorage.counter;
            this.index = idTarget[idTarget.length - 1] - 1;
            this.name = Storage.items[this.index][0];
            this.owner = Storage.items[this.index][1];
            this.stars = Storage.items[this.index][2];

            collection.add(this); //добавление в Set коллекцию
            localStorage.counter++;
         }
      } catch (e) {}
   }
   static createItem(item) {
      const fragment = document.createDocumentFragment();
      const listItem = document.createElement('div');
      listItem.classList.add('list-item');
      const listInfo = document.createElement('div');
      listInfo.classList.add('list-info');
      const itemDelete = document.createElement('div');
      itemDelete.classList.add('item-delete');
      itemDelete.setAttribute('id', `d${item.id}`);

      const name = document.createElement('p');
      name.textContent = 'Name: ' + item.name;
      const owner = document.createElement('p');
      owner.textContent = 'Owner: ' + item.owner;
      const stars = document.createElement('p');
      stars.textContent = 'Stars: ' + item.stars;

      const deleteCross = document.createElement('p');
      deleteCross.insertAdjacentHTML('afterbegin', '&#10006;');

      listInfo.appendChild(name);
      listInfo.appendChild(owner);
      listInfo.appendChild(stars);
      itemDelete.appendChild(deleteCross);
      listItem.appendChild(listInfo);
      listItem.appendChild(itemDelete);

      fragment.appendChild(listItem);
      listRepo.appendChild(fragment);
   }
}

const startGithubApiScript = main();
startGithubApiScript();

//основная функция и замыкание
function main() {
   const autoComplete = document.getElementById('autoComplete');
   autoComplete.style.display = 'none'; // не отображать автокомплит
   const listRepo = document.getElementById('listRepo');
   const search = document.getElementById('searchInput');
   let itemCollection; // переменная для Set коллекции

   const t = throttle(requestRepos, 3000);

   //счетчик для задания id блокам-репозиториям
   if (!localStorage.getItem('counter')) {
      localStorage.setItem('counter', 0);
   }

   //если в local storage только counter, то создается Set,
   //иначе создаем новый Set с элементами из local storage | отрисовка репозиториев
   if (localStorage.length === 1) {
      itemCollection = new Set();
   } else {
      const localStorageValues = Object.values(localStorage).map((item) => JSON.parse(item));
      itemCollection = new Set(localStorageValues);
      renderItemList(itemCollection);
   }
   return function () {
      // Ввод в строку поиска
      search.addEventListener('keyup', () => {
         if (search.value.length === 0) {
            autoComplete.style.display = 'none';
         } else {
            autoComplete.style.display = 'block';
            t(search.value); // троттлинг
         }
      });

      // Клик по найденому репозиторию
      autoComplete.addEventListener('click', (e) => {
         //создается экземпляр
         let newRepo = new Storage(e.target.id, itemCollection);
         //если же экземпляр со всеми значениями = undefined (был клик по пустому элементу)
         //то такой экземпляр игнорируется благодаря проверке
         if (newRepo.id) {
            localStorage.setItem(newRepo.id, JSON.stringify(newRepo));
            Storage.createItem(newRepo);
         }

         console.log(itemCollection);

         search.value = '';
         autoComplete.style.display = 'none';
      });

      // Удаление репозитория из DOM и localStorage
      listRepo.addEventListener('click', (e) => {
         if (e.target.id) {
            localStorage.removeItem(e.target.id.slice(1)); //удаление элемента из localStorage
            e.target.parentNode.remove(); //удаление элемента из DOM

            // !!! Очистка Set коллекции не проводится, так как после перезагрузки она возьмет данные из localStorage !!!

            // если все репозитории были удалены, то обнулить counter (counter задает id)
            if (localStorage.length === 1) {
               localStorage.setItem('counter', 0);
            }
         }
      });
   };
}

// AJAX запрос
function requestRepos(searchValue) {
   return new Promise((res, rej) => {
      fetch(`https://api.github.com/search/repositories?q=${searchValue}&per_page=5`)
         .then((response) => response.json())
         .then((data) => res(data))
         .catch((error) => rej(error));
   });
}

// Обработка запроса
async function getReposData(request) {
   try {
      let data = await request;
      const takeData = []; //хранение в виде массива: имени, владельца, звезд
      const autocompleteChilds = Array.from(autoComplete.children); //перевод ИЗ псевдомассива

      //взятие нужных данных из полученного объекта от промиса
      data.items.forEach((obj) => {
         takeData.push([obj.name, obj.owner.login, obj.stargazers_count]);
      });

      //отображение текста (результатов) в автокомплите при помощи переменной takeData
      autocompleteChilds.map((item, index) => {
         if (takeData[index]) {
            //если результат был найден - то отобразить название
            item.children[0].textContent = takeData[index][0];
         } else {
            //если результат не найден - то не отображать
            item.children[0].textContent = '';
         }
      });
      Storage.items = takeData;
   } catch (error) {
      console.log(error);
   }
}

//отрисовка уже добавленных репозиториев после перезагрузки страницы
function renderItemList(collection) {
   [...collection.values()].map((item) => typeof item !== 'number' && Storage.createItem(item));
}

// троттлинг
function throttle(fn, throttleTime) {
   let isWaiting = false;
   let savedArgs = null;
   let savedThis = null;
   return function wrapper(...args) {
      console.log(args);
      if (isWaiting) {
         savedArgs = args;
         savedThis = this;
         return;
      }
      const promise = fn.apply(this, args);
      //оставил вывод промиса, чтобы удостовериться в работе троттлинга
      console.log(promise);
      getReposData(promise);
      isWaiting = true;
      setTimeout(() => {
         isWaiting = false;
         if (savedThis) {
            const promise = fn.apply(savedThis, savedArgs);
            //оставил вывод промиса, чтобы удостовериться в работе троттлинга
            console.log(promise);
            getReposData(promise);
            savedArgs = null;
            savedThis = null;
         }
      }, throttleTime);
   };
}
