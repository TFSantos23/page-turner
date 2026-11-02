  const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTDFr9pjIJK0Xfj-3Rwu_e8e2cjYVU-JmAHt-23TpMkdv99-2R70Ot_Rf1JQph0esLZQMn9hczSOKyX/pub?gid=0&single=true&output=csv";

  let books = [];

  const HOW_MANY = 3;

  const box = document.getElementById("results");
  const genreFilter = document.getElementById("genre");
  const genreBoxes = genreFilter.querySelectorAll("input");
  const pagesFilter = document.getElementById("pages");
  const pickButton = document.getElementById("pick");
  const moreButton = document.getElementById("more");
  const clearButton = document.getElementById("clear");
  const allButton = document.getElementById("all");
  const pagesLabel = document.getElementById("pages-label");

  let pool = [];
  let shown = 0;

  function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else { inQuotes = false; }
      } else {
        cell += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(cell); cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") { i++; }
      row.push(cell); rows.push(row); row = []; cell = "";
    } else {
      cell += c;
    }
  }
  if (cell !== "" || row.length > 0) { row.push(cell); rows.push(row); }
  return rows;
}

function splitList(text) {
  return text.split(/[;,]/).map(function (item) {
    return item.trim().toLowerCase();
  }).filter(function (item) {
    return item !== "";
  });
}
  
function toBooks(text) {
  const rows = parseCSV(text);
  const headers = rows[0].map(function (h) { return h.trim().toLowerCase(); });
  const result = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const book = {};
    for (let c = 0; c < headers.length; c++) {
      book[headers[c]] = (row[c] || "").trim();
    }
    book.genre = splitList(book.genre);
    book.mood = splitList(book.mood);
    if (book.title) {
      book.pages = Number(book.pages) || 0;
      result.push(book);
    }
  }
  return result;
}

const message = document.getElementById("message");

async function loadBooks() {
  try {
    const response = await fetch(SHEET_URL);
    const text = await response.text();
    books = toBooks(text);
    const longest = Math.max(...books.map(function (b) { return b.pages; }));
    const top = Math.max(100, Math.ceil(longest / 50) * 50);
    pagesFilter.max = top;
    pagesFilter.value = top;
    updatePagesLabel();
    console.log(Object.keys(books[0]));
    console.log([...new Set(books.flatMap(function (b) { return b.mood; }))]);
    message.textContent = books.length + " livros carregados.";
  } catch (error) {
    message.textContent = "O gajo que programou isto não percebe nada e não conseguimos aceder à lista de livros. Verifica o link.";
  }
}

loadBooks();

  function updatePagesLabel() {
    const value = Number(pagesFilter.value);
    const noLimit = value >= Number(pagesFilter.max);
    pagesLabel.textContent = noLimit ? "sem limite" : "até " + value + " páginas";
  }

  function normalize(text) {
    return text.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function getMatching() {
    const mood = document.querySelector("#mood input:checked").value;
    const chosenLanguage = document.querySelector("#language input:checked").value;
    const maxPages = Number(pagesFilter.value);
    const noPageLimit = maxPages >= Number(pagesFilter.max);
    const chosenGenres = [];
    for (const checkbox of genreBoxes) {
      if (checkbox.checked) {
        chosenGenres.push(checkbox.value);
      }
    }
    return books.filter(function (book) {
      // CHANGED: genre check
      const genreOk = chosenGenres.length === 0 || chosenGenres.some(function (g) {
        return book.genre.includes(g);
      });
      // CHANGED: mood check
      const moodOk = mood === "" || book.mood.includes(mood);
      const pagesOk = noPageLimit || book.pages <= maxPages;
      const languageOk = chosenLanguage === "" ||
        normalize(book.language || "") === normalize(chosenLanguage);
      return genreOk && pagesOk && moodOk && languageOk;
    });
  }

  function shuffle(list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }

  function bookHTML(book) {
  const pages = book.pages ? book.pages + " páginas" : "";
  return '<div class="book">' +
    '<div class="book-text">' +
      '<span class="book-title">' + book.title + '</span>' +
      '<span class="book-author">' + book.author + '</span>' +
    '</div>' +
    '<div class="book-pages">' + pages + '</div>' +
  '</div>';
  }

  function showNext() {
    box.innerHTML = "";
    if (pool.length === 0) {
      box.innerHTML = "<p>Não há livros desses.</p>";
      moreButton.hidden = true;
      allButton.hidden = true;
      return;
    }
    const count = Math.min(HOW_MANY, pool.length);
    for (let i = 0; i < count; i++) {
      const book = pool[(shown + i) % pool.length];
      box.innerHTML += bookHTML(book);
    }
    shown = shown + count;
    moreButton.hidden = pool.length <= HOW_MANY;
    allButton.hidden = pool.length <= HOW_MANY;
  }

  function showAll() {
    box.innerHTML = "";
    for (const book of pool) {
      box.innerHTML += bookHTML(book);
    }
    moreButton.hidden = true;
    allButton.hidden = true;
  }

  function pickOptions() {
    pool = shuffle(getMatching());
    shown = 0;
    showNext();
  }

  function clearFilters() {
    for (const checkbox of genreBoxes) {
      checkbox.checked = false;
    }
    document.querySelector('#mood input[value=""]').checked = true;
    pagesFilter.value = pagesFilter.max;
    updatePagesLabel();

    pool = [];
    shown = 0;
    box.innerHTML = "";
    moreButton.hidden = true;
    allButton.hidden = true;
    document.querySelector('#language input[value=""]').checked = true;
  }

  pickButton.onclick = pickOptions;
  moreButton.onclick = showNext;
  clearButton.onclick = clearFilters;
  allButton.onclick = showAll;
  pagesFilter.oninput = updatePagesLabel;
