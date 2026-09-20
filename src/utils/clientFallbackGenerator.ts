export function generateClientFallbackApp(prompt: string) {
  const cleanPrompt = prompt.trim();
  const words = cleanPrompt.split(/\s+/);
  const title = words.length > 0 
    ? words.slice(0, 4).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : 'Interactive Web App';

  const htmlCode = `<!doctype html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            fluent: {
              bg: '#181818',
              card: '#202020',
              border: '#383838',
              blue: '#0078d4',
              hover: '#2d2d2d'
            }
          }
        }
      }
    }
  </script>
</head>
<body class="bg-[#181818] text-[#f3f3f3] min-h-screen font-sans antialiased flex flex-col selection:bg-blue-500/30">
  <header class="border-b border-[#383838] bg-[#202020]/80 backdrop-blur sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-lg">
        ⚡
      </div>
      <div>
        <h1 class="text-base font-semibold tracking-tight text-[#f3f3f3]">${title}</h1>
        <p class="text-xs text-[#a0a0a0]">Generated for: "${cleanPrompt}"</p>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <button id="resetDataBtn" class="px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#383838] text-[#f3f3f3] text-xs font-medium rounded-lg border border-[#383838] transition-all flex items-center gap-1.5 cursor-pointer">
        <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
        <span>Reset Data</span>
      </button>
    </div>
  </header>

  <main class="flex-1 max-w-5xl w-full mx-auto p-6 space-y-6">
    <div class="bg-[#202020] border border-[#383838] rounded-xl p-6 shadow-sm">
      <div class="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div class="flex-1 w-full">
          <label class="block text-xs font-medium text-[#a0a0a0] mb-2">Add New Item or Entry</label>
          <div class="flex gap-2">
            <input 
              type="text" 
              id="itemInput" 
              placeholder="Type what you want to add..." 
              class="flex-1 bg-[#242424] border border-[#383838] rounded-lg px-4 py-2.5 text-sm text-[#f3f3f3] placeholder-[#707070] focus:outline-none focus:border-blue-500 transition-all"
            />
            <button 
              id="addItemBtn" 
              class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer shrink-0"
            >
              <i data-lucide="plus" class="w-4 h-4"></i>
              <span>Add</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="bg-[#202020] border border-[#383838] rounded-xl p-4 flex items-center gap-4">
        <div class="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
          <i data-lucide="layers" class="w-5 h-5"></i>
        </div>
        <div>
          <p class="text-xs text-[#a0a0a0]">Total Items</p>
          <p id="statTotal" class="text-xl font-semibold text-[#f3f3f3]">0</p>
        </div>
      </div>
      <div class="bg-[#202020] border border-[#383838] rounded-xl p-4 flex items-center gap-4">
        <div class="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <i data-lucide="check-circle" class="w-5 h-5"></i>
        </div>
        <div>
          <p class="text-xs text-[#a0a0a0]">Completed</p>
          <p id="statCompleted" class="text-xl font-semibold text-[#f3f3f3]">0</p>
        </div>
      </div>
      <div class="bg-[#202020] border border-[#383838] rounded-xl p-4 flex items-center gap-4">
        <div class="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
          <i data-lucide="activity" class="w-5 h-5"></i>
        </div>
        <div>
          <p class="text-xs text-[#a0a0a0]">Progress</p>
          <p id="statProgress" class="text-xl font-semibold text-[#f3f3f3]">0%</p>
        </div>
      </div>
    </div>

    <div class="bg-[#202020] border border-[#383838] rounded-xl overflow-hidden shadow-sm">
      <div class="px-6 py-4 border-b border-[#383838] flex items-center justify-between">
        <h2 class="text-sm font-semibold text-[#f3f3f3]">Entries & Records</h2>
        <div class="flex items-center gap-2 text-xs text-[#a0a0a0]">
          <span id="itemCountLabel">0 items</span>
        </div>
      </div>
      <ul id="itemList" class="divide-y divide-[#383838] min-h-[160px]">
        <!-- Dynamic items -->
      </ul>
    </div>
  </main>

  <script>
    let items = JSON.parse(localStorage.getItem('abs_fallback_items_${title.toLowerCase().replace(/\\s+/g, '_')}') || '[]');
    if (items.length === 0) {
      items = [
        { id: 1, text: 'Explore ${title}', completed: true, time: 'Just now' },
        { id: 2, text: 'Add your own items and notes', completed: false, time: 'Just now' }
      ];
    }

    function save() {
      localStorage.setItem('abs_fallback_items_${title.toLowerCase().replace(/\\s+/g, '_')}', JSON.stringify(items));
      render();
    }

    function render() {
      const list = document.getElementById('itemList');
      list.innerHTML = '';

      if (items.length === 0) {
        list.innerHTML = \`<li class="p-12 text-center text-[#707070] text-sm flex flex-col items-center gap-2">
          <i data-lucide="inbox" class="w-8 h-8 text-[#505050]"></i>
          <span>No items yet. Add one above!</span>
        </li>\`;
      } else {
        items.forEach((item, index) => {
          const li = document.createElement('li');
          li.className = "px-6 py-3.5 flex items-center justify-between hover:bg-[#242424] transition-all group";
          li.innerHTML = \`
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <input type="checkbox" \${item.completed ? 'checked' : ''} data-id="\${item.id}" class="w-4 h-4 rounded border-[#383838] bg-[#242424] text-blue-600 focus:ring-blue-500 cursor-pointer">
              <span class="text-sm truncate \${item.completed ? 'line-through text-[#707070]' : 'text-[#f3f3f3]'}">\${escapeHtml(item.text)}</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs text-[#707070]">\${item.time || ''}</span>
              <button data-id="\${item.id}" class="delete-btn text-[#707070] hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          \`;
          list.appendChild(li);
        });
      }

      const total = items.length;
      const completed = items.filter(i => i.completed).length;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

      document.getElementById('statTotal').innerText = total;
      document.getElementById('statCompleted').innerText = completed;
      document.getElementById('statProgress').innerText = progress + '%';
      document.getElementById('itemCountLabel').innerText = total + ' items';

      lucide.createIcons();
    }

    function escapeHtml(str) {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    document.getElementById('addItemBtn').addEventListener('click', () => {
      const input = document.getElementById('itemInput');
      const val = input.value.trim();
      if (!val) return;
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      items.unshift({ id: Date.now(), text: val, completed: false, time });
      input.value = '';
      save();
    });

    document.getElementById('itemInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('addItemBtn').click();
    });

    document.getElementById('itemList').addEventListener('click', (e) => {
      const target = e.target;
      const checkbox = target.closest('input[type="checkbox"]');
      if (checkbox) {
        const id = Number(checkbox.dataset.id);
        const item = items.find(i => i.id === id);
        if (item) {
          item.completed = checkbox.checked;
          save();
        }
        return;
      }
      const delBtn = target.closest('.delete-btn');
      if (delBtn) {
        const id = Number(delBtn.dataset.id);
        items = items.filter(i => i.id !== id);
        save();
      }
    });

    document.getElementById('resetDataBtn').addEventListener('click', () => {
      if (confirm('Reset all items?')) {
        items = [];
        localStorage.removeItem('abs_fallback_items_${title.toLowerCase().replace(/\\s+/g, '_')}');
        save();
      }
    });

    render();
  </script>
</body>
</html>`;

  return {
    appTitle: title,
    description: `Interactive web application for ${cleanPrompt}`,
    code: htmlCode,
    summaryOfChanges: `Generated "${title}" with fully interactive client-side state, stats counter, persistence, and modern styling.`,
    suggestedNextPrompts: [
      'Add data export to CSV or JSON',
      'Add category filters and search',
      'Add dark/light theme toggle'
    ],
    modelUsed: 'client-side-workers-fallback'
  };
}
