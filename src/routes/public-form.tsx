import { Hono } from 'hono';
import { ROMANIAN_BIBLE_BOOKS } from '@/data/romanian-books';

const app = new Hono();

// Serve the quote submission form
app.get('/', (c) => {
  const booksJson = JSON.stringify(ROMANIAN_BIBLE_BOOKS);

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

                <div class="flex flex-col gap-3">
                  <button
                    type="button"
                    id="next-step-1"
                    class="btn-primary w-full px-6 py-2.5 rounded-lg font-medium"
                  >
                    Continuă →
                  </button>
                  <button
                    type="button"
                    id="continue-anonymous"
                    class="btn-ghost w-full px-6 py-2.5 rounded-lg font-medium"
                  >
                    Continuă ca anonim
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
                  <select
                    id="book"
                    name="book"
                    class="form-input w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white"
                    required
                  >
                    <option value="">Selectează o carte...</option>
                  </select>
                </div>

                <!-- Chapter Selection -->
                <div class="space-y-2">
                  <label for="chapter" class="block text-sm font-medium text-gray-900">
                    Capitolul
                  </label>
                  <select
                    id="chapter"
                    name="chapter"
                    class="form-input w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white"
                    required
                    disabled
                  >
                    <option value="">Mai întâi selectează o carte</option>
                  </select>
                </div>

                <!-- Verse Selection -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="space-y-2">
                    <label for="startVerse" class="block text-sm font-medium text-gray-900">
                      Verset (de la)
                    </label>
                    <select
                      id="startVerse"
                      name="startVerse"
                      class="form-input w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white"
                      required
                      disabled
                    >
                      <option value="">Mai întâi selectează un capitol</option>
                    </select>
                  </div>
                  <div class="space-y-2">
                    <label for="endVerse" class="block text-sm font-medium text-gray-900">
                      Până la verset (opțional)
                    </label>
                    <select
                      id="endVerse"
                      name="endVerse"
                      class="form-input w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white"
                      disabled
                    >
                      <option value="">Același verset</option>
                    </select>
                  </div>
                </div>

                <!-- User Note -->
                <div class="space-y-2">
                  <label for="userNote" class="block text-sm font-medium text-gray-900">
                    De ce este special acest verset pentru tine?
                  </label>
                  <textarea
                    id="userNote"
                    name="userNote"
                    rows="4"
                    placeholder="Scrie gândurile tale aici..."
                    class="form-input w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 resize-none"
                    required
                  ></textarea>
                  <p class="text-xs text-gray-500">
                    Împărtășește de ce acest verset înseamnă ceva special pentru tine
                  </p>
                </div>

                <!-- Action Buttons -->
                <div class="flex justify-between gap-3">
                  <button
                    type="button"
                    id="back-step-2"
                    class="btn-secondary px-4 sm:px-6 py-2.5 rounded-lg font-medium flex-shrink-0"
                  >
                    ← Înapoi
                  </button>
                  <button
                    type="submit"
                    id="submit-button"
                    class="btn-primary px-4 sm:px-6 py-2.5 rounded-lg font-medium flex-1"
                  >
                    Publică versetul
                  </button>
                </div>

                <!-- Loading State -->
                <div id="loading-state" class="hidden text-center py-4">
                  <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-primary"></div>
                  <p class="text-sm text-gray-600 mt-2">Se publică...</p>
                </div>

                <!-- Error Message -->
                <div id="error-message" class="hidden bg-red-50 border border-red-200 rounded-lg p-4">
                  <p class="text-sm text-red-800"></p>
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
              <h2 class="text-2xl font-semibold text-gray-900 mb-2">Mulțumim!</h2>
              <p class="text-gray-600 mb-2">
                Versetul tău a fost publicat cu succes și este acum vizibil tuturor.
              </p>
              <p class="text-sm text-gray-500 mb-6" id="verse-count-message">
                <!-- Will be populated with "Ai publicat al X-lea verset!" -->
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

          // DOM elements
          const step1 = document.getElementById('step-1');
          const step2 = document.getElementById('step-2');
          const successState = document.getElementById('success-state');
          const userNameInput = document.getElementById('userName');
          const nextStep1Btn = document.getElementById('next-step-1');
          const continueAnonymousBtn = document.getElementById('continue-anonymous');
          const backStep2Btn = document.getElementById('back-step-2');
          const bookSelect = document.getElementById('book');
          const chapterSelect = document.getElementById('chapter');
          const startVerseSelect = document.getElementById('startVerse');
          const endVerseSelect = document.getElementById('endVerse');
          const quoteForm = document.getElementById('quote-form');
          const loadingState = document.getElementById('loading-state');
          const errorMessage = document.getElementById('error-message');
          const submitAnotherBtn = document.getElementById('submit-another');
          const verseCountMessage = document.getElementById('verse-count-message');

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

          // Populate books dropdown
          BOOKS.forEach(book => {
            const option = document.createElement('option');
            option.value = book.slug;
            option.textContent = book.name;
            option.dataset.chapters = book.chapters;
            bookSelect.appendChild(option);
          });

          // Step 1: Next button
          nextStep1Btn.addEventListener('click', () => {
            const name = userNameInput.value.trim();
            if (!name) {
              userNameInput.focus();
              return;
            }

            // Save name to cookie
            setCookie('userName', name);

            // Move to step 2
            step1.classList.add('hidden');
            step2.classList.remove('hidden');
            step2.classList.add('fade-in');
          });

          // Continue as anonymous
          continueAnonymousBtn.addEventListener('click', () => {
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

          // Book selection change
          bookSelect.addEventListener('change', (e) => {
            const selectedOption = e.target.selectedOptions[0];
            if (!selectedOption.value) {
              chapterSelect.disabled = true;
              chapterSelect.innerHTML = '<option value="">Mai întâi selectează o carte</option>';
              return;
            }

            const chapters = parseInt(selectedOption.dataset.chapters);
            chapterSelect.innerHTML = '<option value="">Selectează un capitol...</option>';
            for (let i = 1; i <= chapters; i++) {
              const option = document.createElement('option');
              option.value = i;
              option.textContent = 'Capitolul ' + i;
              chapterSelect.appendChild(option);
            }
            chapterSelect.disabled = false;

            // Reset verse selections
            startVerseSelect.disabled = true;
            startVerseSelect.innerHTML = '<option value="">Mai întâi selectează un capitol</option>';
            endVerseSelect.disabled = true;
            endVerseSelect.innerHTML = '<option value="">Același verset</option>';
          });

          // Chapter selection change
          chapterSelect.addEventListener('change', (e) => {
            if (!e.target.value) {
              startVerseSelect.disabled = true;
              startVerseSelect.innerHTML = '<option value="">Mai întâi selectează un capitol</option>';
              return;
            }

            // Generate verse options (simplified - using max 100 verses)
            const maxVerses = 100;
            startVerseSelect.innerHTML = '<option value="">Selectează un verset...</option>';
            for (let i = 1; i <= maxVerses; i++) {
              const option = document.createElement('option');
              option.value = i;
              option.textContent = 'Versetul ' + i;
              startVerseSelect.appendChild(option);
            }
            startVerseSelect.disabled = false;

            // Reset end verse
            endVerseSelect.disabled = true;
            endVerseSelect.innerHTML = '<option value="">Același verset</option>';
          });

          // Start verse selection change
          startVerseSelect.addEventListener('change', (e) => {
            if (!e.target.value) {
              endVerseSelect.disabled = true;
              endVerseSelect.innerHTML = '<option value="">Același verset</option>';
              return;
            }

            const startVerse = parseInt(e.target.value);
            const maxVerses = 100;
            endVerseSelect.innerHTML = '<option value="">Același verset</option>';
            for (let i = startVerse + 1; i <= maxVerses; i++) {
              const option = document.createElement('option');
              option.value = i;
              option.textContent = 'Versetul ' + i;
              endVerseSelect.appendChild(option);
            }
            endVerseSelect.disabled = false;
          });

          // Form submission
          quoteForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const savedUserName = getCookie('userName');
            const userName = savedUserName === 'anonymous' ? null : savedUserName;
            const book = bookSelect.value;
            const chapter = parseInt(chapterSelect.value);
            const startVerse = parseInt(startVerseSelect.value);
            const endVerse = endVerseSelect.value ? parseInt(endVerseSelect.value) : null;
            const userNote = document.getElementById('userNote').value.trim();

            // Build reference string
            const bookName = bookSelect.selectedOptions[0].textContent;
            let reference = bookName + ' ' + chapter + ':' + startVerse;
            if (endVerse && endVerse !== startVerse) {
              reference += '-' + endVerse;
            }

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
                  reference: reference,
                  startBook: book,
                  startChapter: chapter,
                  startVerse: startVerse,
                  endVerse: endVerse || undefined,
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
              verseCountMessage.textContent = 'Ai publicat al ' + quoteId + '-lea verset!';

              step2.classList.add('hidden');
              successState.classList.remove('hidden');
            } catch (error) {
              console.error('Error submitting quote:', error);
              errorMessage.classList.remove('hidden');
              errorMessage.querySelector('p').textContent = error.message;
            } finally {
              loadingState.classList.add('hidden');
              document.getElementById('submit-button').disabled = false;
            }
          });

          // Submit another quote
          submitAnotherBtn.addEventListener('click', () => {
            // Reset form
            quoteForm.reset();
            bookSelect.value = '';
            chapterSelect.disabled = true;
            chapterSelect.innerHTML = '<option value="">Mai întâi selectează o carte</option>';
            startVerseSelect.disabled = true;
            startVerseSelect.innerHTML = '<option value="">Mai întâi selectează un capitol</option>';
            endVerseSelect.disabled = true;
            endVerseSelect.innerHTML = '<option value="">Același verset</option>';
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
