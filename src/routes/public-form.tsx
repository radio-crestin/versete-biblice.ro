import { Hono } from 'hono';
import vdccBooksData from '@/data/vdcc-books.json';

const app = new Hono();

// Serve the quote submission form
app.get('/', (c) => {
  const booksJson = JSON.stringify(vdccBooksData.books);

  return c.html(`
    <!DOCTYPE html>
    <html lang="ro">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Publică Versetul Tău Preferat - Versete Biblice</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  border: 'hsl(214.3 31.8% 91.4%)',
                  input: 'hsl(214.3 31.8% 91.4%)',
                  ring: 'hsl(221.2 83.2% 53.3%)',
                  background: 'hsl(0 0% 100%)',
                  foreground: 'hsl(222.2 84% 4.9%)',
                  primary: {
                    DEFAULT: 'hsl(221.2 83.2% 53.3%)',
                    foreground: 'hsl(210 40% 98%)',
                  },
                  secondary: {
                    DEFAULT: 'hsl(210 40% 96.1%)',
                    foreground: 'hsl(222.2 47.4% 11.2%)',
                  },
                  muted: {
                    DEFAULT: 'hsl(210 40% 96.1%)',
                    foreground: 'hsl(215.4 16.3% 46.9%)',
                  },
                }
              }
            }
          }
        </script>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          }
          .form-input {
            transition: all 0.2s;
          }
          .form-input:focus {
            outline: none;
            border-color: hsl(221.2 83.2% 53.3%);
            box-shadow: 0 0 0 3px hsla(221.2, 83.2%, 53.3%, 0.1);
          }
          .btn-primary {
            background: hsl(221.2 83.2% 53.3%);
            color: white;
            transition: all 0.2s;
          }
          .btn-primary:hover {
            background: hsl(221.2 83.2% 45%);
          }
          .btn-secondary {
            background: hsl(210 40% 96.1%);
            color: hsl(222.2 47.4% 11.2%);
            transition: all 0.2s;
          }
          .btn-secondary:hover {
            background: hsl(210 40% 90%);
          }
          .btn-ghost {
            background: transparent;
            color: hsl(222.2 47.4% 11.2%);
            border: 1px solid hsl(214.3 31.8% 91.4%);
            transition: all 0.2s;
          }
          .btn-ghost:hover {
            background: hsl(210 40% 98%);
          }
          .fade-in {
            animation: fadeIn 0.3s ease-in;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          /* Combobox styles */
          .combobox {
            position: relative;
          }
          .combobox-trigger {
            cursor: pointer;
          }
          .combobox-trigger:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            background-color: hsl(210 40% 96.1%);
          }
          .combobox-content {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            margin-top: 4px;
            background: white;
            border: 1px solid hsl(214.3 31.8% 91.4%);
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            max-height: 300px;
            overflow-y: auto;
            z-index: 50;
            display: none;
          }
          .combobox-content.open {
            display: block;
          }
          .combobox-search {
            position: sticky;
            top: 0;
            background: white;
            border-bottom: 1px solid hsl(214.3 31.8% 91.4%);
            padding: 8px;
          }
          .combobox-list {
            padding: 4px;
          }
          .combobox-item {
            padding: 8px 12px;
            cursor: pointer;
            border-radius: 4px;
            transition: background 0.15s;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .combobox-item:hover {
            background: hsl(210 40% 96.1%);
          }
          .combobox-item.selected {
            background: hsl(210 40% 96.1%);
          }
          .combobox-item .check-icon {
            width: 16px;
            height: 16px;
            opacity: 0;
          }
          .combobox-item.active .check-icon {
            opacity: 1;
          }
          .combobox-empty {
            padding: 16px;
            text-align: center;
            color: hsl(215.4 16.3% 46.9%);
            font-size: 14px;
          }
          .chevron-icon {
            transition: transform 0.2s;
          }
          .combobox-trigger[aria-expanded="true"] .chevron-icon {
            transform: rotate(180deg);
          }
        </style>
      </head>
      <body class="bg-gray-50 min-h-screen flex items-center justify-center py-8">
        <!-- Main Content -->
        <main class="max-w-2xl w-full mx-auto px-4">
          <!-- Form Card -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:p-8">
            <!-- Step 1: Name Input (only show if no cookie) -->
            <div id="step-1" class="fade-in">
              <div class="space-y-6">
                <div>
                  <h2 class="text-xl font-semibold text-gray-900 mb-2">Bine ai venit!</h2>
                  <p class="text-sm text-gray-600">
                    Înainte de a începe, spune-ne cum te cheamă. Numele tău va fi afișat alături de versetul tău preferat.
                  </p>
                </div>

                <div class="space-y-2">
                  <label for="userName" class="block text-sm font-medium text-gray-900">
                    Numele tău
                  </label>
                  <input
                    type="text"
                    id="userName"
                    name="userName"
                    placeholder="De exemplu: Maria Popescu"
                    class="form-input w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400"
                  />
                  <p class="text-xs text-gray-500">
                    Acest nume va fi vizibil public (opțional)
                  </p>
                </div>

                <!-- Error Message for Step 1 -->
                <div id="error-message-step-1" class="hidden bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p class="text-sm text-red-800">Te rugăm să introduci un nume sau să continui ca anonim.</p>
                </div>

                <div class="flex justify-end gap-3">
                  <button
                    type="button"
                    id="continue-anonymous"
                    class="btn-ghost px-4 sm:px-6 py-2.5 rounded-lg font-medium"
                  >
                    Continuă ca anonim
                  </button>
                  <button
                    type="button"
                    id="next-step-1"
                    class="btn-primary px-4 sm:px-6 py-2.5 rounded-lg font-medium"
                  >
                    Continuă
                  </button>
                </div>
              </div>
            </div>

            <!-- Step 2: Verse Selection -->
            <div id="step-2" class="hidden">
              <form id="quote-form" class="space-y-6">
                <div>
                  <h2 class="text-xl font-semibold text-gray-900 mb-2">Alege versetul</h2>
                  <p class="text-sm text-gray-600">
                    Selectează cartea, capitolul și versetul biblic preferat.
                  </p>
                </div>

                <!-- Book Selection -->
                <div class="space-y-2">
                  <label for="book" class="block text-sm font-medium text-gray-900">
                    Cartea biblică
                  </label>
                  <div class="combobox" id="book-combobox">
                    <button
                      type="button"
                      class="combobox-trigger form-input w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white flex items-center justify-between"
                      aria-expanded="false"
                      aria-controls="book-listbox"
                    >
                      <span id="book-value">Selectează o carte...</span>
                      <svg class="chevron-icon h-4 w-4 shrink-0 opacity-50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div class="combobox-content" id="book-listbox" role="listbox">
                      <div class="combobox-search">
                        <input
                          type="text"
                          placeholder="Caută carte..."
                          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          id="book-search"
                        />
                      </div>
                      <div class="combobox-list" id="book-options"></div>
                    </div>
                    <input type="hidden" id="book" name="book" required />
                  </div>
                </div>

                <!-- Chapter and Verse Selection (single row) -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="space-y-2">
                    <label for="chapter" class="block text-sm font-medium text-gray-900">
                      Capitolul
                    </label>
                    <div class="combobox" id="chapter-combobox">
                      <button
                        type="button"
                        class="combobox-trigger form-input w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white flex items-center justify-between"
                        aria-expanded="false"
                        aria-controls="chapter-listbox"
                        disabled
                      >
                        <span id="chapter-value">Mai întâi selectează o carte</span>
                        <svg class="chevron-icon h-4 w-4 shrink-0 opacity-50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <div class="combobox-content" id="chapter-listbox" role="listbox">
                        <div class="combobox-search">
                          <input
                            type="text"
                            placeholder="Caută capitol..."
                            class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            id="chapter-search"
                          />
                        </div>
                        <div class="combobox-list" id="chapter-options"></div>
                      </div>
                      <input type="hidden" id="chapter" name="chapter" required />
                    </div>
                  </div>
                  <div class="space-y-2">
                    <label for="startVerse" class="block text-sm font-medium text-gray-900">
                      Versetul
                    </label>
                    <div class="combobox" id="startVerse-combobox">
                      <button
                        type="button"
                        class="combobox-trigger form-input w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white flex items-center justify-between"
                        aria-expanded="false"
                        aria-controls="startVerse-listbox"
                        disabled
                      >
                        <span id="startVerse-value">Mai întâi selectează un capitol</span>
                        <svg class="chevron-icon h-4 w-4 shrink-0 opacity-50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <div class="combobox-content" id="startVerse-listbox" role="listbox">
                        <div class="combobox-search">
                          <input
                            type="text"
                            placeholder="Caută verset..."
                            class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            id="startVerse-search"
                          />
                        </div>
                        <div class="combobox-list" id="startVerse-options"></div>
                      </div>
                      <input type="hidden" id="startVerse" name="startVerse" required />
                    </div>
                  </div>
                </div>

                <!-- User Note -->
                <div class="space-y-2">
                  <label for="userNote" class="block text-sm font-medium text-gray-900">
                    De ce este special acest verset pentru tine? (opțional)
                  </label>
                  <textarea
                    id="userNote"
                    name="userNote"
                    rows="4"
                    placeholder="Scrie gândurile tale aici..."
                    class="form-input w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 resize-none"
                  ></textarea>
                  <p class="text-xs text-gray-500">
                    Împărtășește de ce acest verset înseamnă ceva special pentru tine
                  </p>
                </div>

                <!-- Error Message -->
                <div id="error-message" class="hidden bg-red-50 border border-red-200 rounded-lg p-4">
                  <p class="text-sm text-red-800"></p>
                </div>

                <!-- Loading State -->
                <div id="loading-state" class="hidden text-center py-4">
                  <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-primary"></div>
                  <p class="text-sm text-gray-600 mt-2">Se publică...</p>
                </div>

                <!-- Action Buttons -->
                <div class="flex justify-between gap-3">
                  <button
                    type="button"
                    id="back-step-2"
                    class="btn-secondary px-4 sm:px-6 py-2.5 rounded-lg font-medium"
                  >
                    ← Înapoi
                  </button>
                  <button
                    type="submit"
                    id="submit-button"
                    class="btn-primary px-4 sm:px-6 py-2.5 rounded-lg font-medium"
                  >
                    Publică versetul
                  </button>
                </div>
              </form>
            </div>

            <!-- Success State -->
            <div id="success-state" class="hidden fade-in text-center py-8">
              <div class="mb-4">
                <svg class="mx-auto h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 class="text-2xl font-semibold text-gray-900 mb-2">Felicitări! 🎉</h2>
              <p class="text-gray-600 mb-6" id="verse-count-message">
                <!-- Will be populated dynamically -->
              </p>
              <button
                type="button"
                id="submit-another"
                class="btn-primary px-6 py-2.5 rounded-lg font-medium"
              >
                Publică alt verset
              </button>
            </div>
          </div>
        </main>

        <script>
          // Bible books data
          const BOOKS = ${booksJson};

          // Cookie helpers
          function setCookie(name, value, days = 365) {
            const expires = new Date();
            expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
            document.cookie = name + '=' + value + ';expires=' + expires.toUTCString() + ';path=/';
          }

          function getCookie(name) {
            const nameEQ = name + '=';
            const ca = document.cookie.split(';');
            for (let i = 0; i < ca.length; i++) {
              let c = ca[i];
              while (c.charAt(0) === ' ') c = c.substring(1, c.length);
              if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
            }
            return null;
          }

          // Combobox class for searchable dropdowns
          class Combobox {
            constructor(id, options = {}) {
              this.id = id;
              this.combobox = document.getElementById(id + '-combobox');
              this.trigger = this.combobox.querySelector('.combobox-trigger');
              this.content = this.combobox.querySelector('.combobox-content');
              this.search = this.combobox.querySelector('[id$="-search"]');
              this.listEl = this.combobox.querySelector('[id$="-options"]');
              this.valueEl = this.combobox.querySelector('[id$="-value"]');
              this.hiddenInput = document.getElementById(id);

              this.items = [];
              this.selectedValue = null;
              this.selectedLabel = null;
              this.onChange = options.onChange || (() => {});
              this.placeholder = options.placeholder || 'Selectează...';

              this.init();
            }

            init() {
              // Toggle dropdown
              this.trigger.addEventListener('click', () => {
                if (!this.trigger.disabled) {
                  const isOpen = this.content.classList.contains('open');
                  this.closeAll();
                  if (!isOpen) {
                    this.open();
                  }
                }
              });

              // Search functionality
              this.search.addEventListener('input', (e) => {
                this.filter(e.target.value);
              });

              // Close on outside click
              document.addEventListener('click', (e) => {
                if (!this.combobox.contains(e.target)) {
                  this.close();
                }
              });
            }

            setItems(items) {
              this.items = items;
              this.render();
            }

            render() {
              this.listEl.innerHTML = '';
              const filteredItems = this.items;

              if (filteredItems.length === 0) {
                this.listEl.innerHTML = '<div class="combobox-empty">Nu s-au găsit rezultate.</div>';
                return;
              }

              filteredItems.forEach(item => {
                const div = document.createElement('div');
                div.className = 'combobox-item';
                if (item.value === this.selectedValue) {
                  div.classList.add('active');
                }
                div.innerHTML = \`
                  <svg class="check-icon h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>\${item.label}</span>
                \`;
                div.addEventListener('click', () => this.selectItem(item));
                this.listEl.appendChild(div);
              });
            }

            filter(query) {
              const filtered = this.items.filter(item =>
                item.label.toLowerCase().includes(query.toLowerCase())
              );

              this.listEl.innerHTML = '';
              if (filtered.length === 0) {
                this.listEl.innerHTML = '<div class="combobox-empty">Nu s-au găsit rezultate.</div>';
                return;
              }

              filtered.forEach(item => {
                const div = document.createElement('div');
                div.className = 'combobox-item';
                if (item.value === this.selectedValue) {
                  div.classList.add('active');
                }
                div.innerHTML = \`
                  <svg class="check-icon h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>\${item.label}</span>
                \`;
                div.addEventListener('click', () => this.selectItem(item));
                this.listEl.appendChild(div);
              });
            }

            selectItem(item) {
              this.selectedValue = item.value;
              this.selectedLabel = item.label;
              this.hiddenInput.value = item.value;
              this.valueEl.textContent = item.label;
              this.close();
              this.onChange(item);
            }

            open() {
              this.content.classList.add('open');
              this.trigger.setAttribute('aria-expanded', 'true');
              this.search.value = '';
              this.render();
              setTimeout(() => this.search.focus(), 100);
            }

            close() {
              this.content.classList.remove('open');
              this.trigger.setAttribute('aria-expanded', 'false');
            }

            closeAll() {
              document.querySelectorAll('.combobox-content.open').forEach(el => {
                el.classList.remove('open');
                el.closest('.combobox').querySelector('.combobox-trigger').setAttribute('aria-expanded', 'false');
              });
            }

            enable() {
              this.trigger.disabled = false;
            }

            disable() {
              this.trigger.disabled = true;
              this.close();
            }

            reset(placeholder) {
              this.selectedValue = null;
              this.selectedLabel = null;
              this.hiddenInput.value = '';
              this.valueEl.textContent = placeholder || this.placeholder;
              this.items = [];
              this.render();
            }

            getValue() {
              return this.selectedValue;
            }

            getSelectedItem() {
              return this.items.find(item => item.value === this.selectedValue);
            }
          }

          // DOM elements
          const step1 = document.getElementById('step-1');
          const step2 = document.getElementById('step-2');
          const successState = document.getElementById('success-state');
          const userNameInput = document.getElementById('userName');
          const nextStep1Btn = document.getElementById('next-step-1');
          const continueAnonymousBtn = document.getElementById('continue-anonymous');
          const backStep2Btn = document.getElementById('back-step-2');
          const quoteForm = document.getElementById('quote-form');
          const loadingState = document.getElementById('loading-state');
          const errorMessage = document.getElementById('error-message');
          const errorMessageStep1 = document.getElementById('error-message-step-1');
          const submitAnotherBtn = document.getElementById('submit-another');
          const verseCountMessage = document.getElementById('verse-count-message');

          // Initialize comboboxes
          const bookCombobox = new Combobox('book', {
            placeholder: 'Selectează o carte...',
            onChange: (item) => {
              // Reset chapter and verse selections
              chapterCombobox.reset('Selectează un capitol...');
              chapterCombobox.disable();
              startVerseCombobox.reset('Mai întâi selectează un capitol');
              startVerseCombobox.disable();

              // Populate chapters
              const book = BOOKS.find(b => b.slug === item.value);
              if (book) {
                const chapters = [];
                for (let i = 1; i <= book.maxChapter; i++) {
                  chapters.push({ value: i.toString(), label: 'Capitolul ' + i });
                }
                chapterCombobox.setItems(chapters);
                chapterCombobox.enable();
              }
            }
          });

          const chapterCombobox = new Combobox('chapter', {
            placeholder: 'Selectează un capitol...',
            onChange: (item) => {
              // Reset verse selections
              startVerseCombobox.reset('Selectează un verset...');
              startVerseCombobox.disable();

              // Populate verses
              const selectedBook = bookCombobox.getSelectedItem();
              if (selectedBook) {
                const book = BOOKS.find(b => b.slug === selectedBook.value);
                const chaptersData = book.chapters;
                const maxVerses = chaptersData[item.value] || 100;

                const verses = [];
                for (let i = 1; i <= maxVerses; i++) {
                  verses.push({ value: i.toString(), label: 'Versetul ' + i });
                }
                startVerseCombobox.setItems(verses);
                startVerseCombobox.enable();
              }
            }
          });

          const startVerseCombobox = new Combobox('startVerse', {
            placeholder: 'Selectează un verset...'
          });

          // Initialize: Check for saved name and skip step 1 if exists
          const savedName = getCookie('userName');
          if (savedName && savedName !== 'anonymous') {
            userNameInput.value = savedName;
            // Skip to step 2 if we have a saved name
            step1.classList.add('hidden');
            step2.classList.remove('hidden');
          } else if (savedName === 'anonymous') {
            // Skip to step 2 for anonymous users
            step1.classList.add('hidden');
            step2.classList.remove('hidden');
          }

          // Populate books combobox
          const bookItems = BOOKS.map(book => ({
            value: book.slug,
            label: book.name
          }));
          bookCombobox.setItems(bookItems);

          // Step 1: Next button
          nextStep1Btn.addEventListener('click', () => {
            const name = userNameInput.value.trim();
            if (!name) {
              errorMessageStep1.classList.remove('hidden');
              userNameInput.focus();
              return;
            }

            // Hide error and save name to cookie
            errorMessageStep1.classList.add('hidden');
            setCookie('userName', name);

            // Move to step 2
            step1.classList.add('hidden');
            step2.classList.remove('hidden');
            step2.classList.add('fade-in');
          });

          // Continue as anonymous
          continueAnonymousBtn.addEventListener('click', () => {
            errorMessageStep1.classList.add('hidden');
            setCookie('userName', 'anonymous');
            step1.classList.add('hidden');
            step2.classList.remove('hidden');
            step2.classList.add('fade-in');
          });

          // Step 2: Back button
          backStep2Btn.addEventListener('click', () => {
            step2.classList.add('hidden');
            step1.classList.remove('hidden');
            step1.classList.add('fade-in');
          });

          // Form submission
          quoteForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const savedUserName = getCookie('userName');
            const userName = savedUserName === 'anonymous' ? null : savedUserName;
            const book = bookCombobox.getValue();
            const chapter = parseInt(chapterCombobox.getValue());
            const startVerse = parseInt(startVerseCombobox.getValue());
            const userNote = document.getElementById('userNote').value.trim();

            // Show loading state
            loadingState.classList.remove('hidden');
            errorMessage.classList.add('hidden');
            document.getElementById('submit-button').disabled = true;

            try {
              const response = await fetch('/api/v1/bible/quotes', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  userName: userName || undefined,
                  startBook: book,
                  startChapter: chapter,
                  startVerse: startVerse,
                  userLanguage: 'ro',
                  userNote: userNote,
                  published: true,
                }),
              });

              const data = await response.json();

              if (!response.ok || !data.success) {
                throw new Error(data.error || 'A apărut o eroare la publicarea versetului');
              }

              // Show success state with verse count
              const quoteId = data.quote.id;
              verseCountMessage.textContent = 'Ai trimis al ' + quoteId + '-lea verset spre a fi publicat.';

              step2.classList.add('hidden');
              successState.classList.remove('hidden');
            } catch (error) {
              console.error('Error submitting quote:', error);
              errorMessage.classList.remove('hidden');
              errorMessage.querySelector('p').textContent = 'A apărut o eroare neașteptată. Vă rugăm să încercați mai târziu.';
            } finally {
              loadingState.classList.add('hidden');
              document.getElementById('submit-button').disabled = false;
            }
          });

          // Submit another quote
          submitAnotherBtn.addEventListener('click', () => {
            // Reset form
            quoteForm.reset();
            bookCombobox.reset('Selectează o carte...');
            chapterCombobox.reset('Mai întâi selectează o carte');
            chapterCombobox.disable();
            startVerseCombobox.reset('Mai întâi selectează un capitol');
            startVerseCombobox.disable();
            errorMessage.classList.add('hidden');

            // Go back to step 2 (skip name input since we have cookie)
            successState.classList.add('hidden');
            step2.classList.remove('hidden');
          });
        </script>
      </body>
    </html>
  `);
});

export { app as publicFormRoute };
