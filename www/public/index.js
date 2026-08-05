// Client-side Application State
let tools = [];
let dragSrcEl = null;

// Colorful Gradients Array
const GRADIENTS = [
  { name: 'indigo-violet', start: '#6366f1', end: '#a855f7', rgb: '99, 102, 241' },
  { name: 'blue-cyan', start: '#3b82f6', end: '#06b6d4', rgb: '59, 130, 246' },
  { name: 'emerald-teal', start: '#10b981', end: '#14b8a6', rgb: '16, 185, 129' },
  { name: 'orange-red', start: '#f97316', end: '#ef4444', rgb: '249, 115, 22' },
  { name: 'rose-pink', start: '#ec4899', end: '#f43f5e', rgb: '236, 72, 153' },
  { name: 'purple-magenta', start: '#8b5cf6', end: '#d946ef', rgb: '139, 92, 246' }
];

// Hash function to get deterministic gradient from title
function getGradientIndex(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

// DOM Elements
const toolsGrid = document.getElementById('tools-grid');
const emptyState = document.getElementById('empty-state');
const emptyAddBtn = document.getElementById('empty-add-btn');
const fabAddBtn = document.getElementById('fab-add-btn');
const searchInput = document.getElementById('search-input');

// Modal Elements
const toolModal = document.getElementById('tool-modal');
const toolForm = document.getElementById('tool-form');
const modalTitle = document.getElementById('modal-title');
const modalCloseBtn = document.getElementById('modal-close-btn');
const btnModalCancel = document.getElementById('btn-modal-cancel');
const btnFetchMeta = document.getElementById('btn-fetch-meta');

// Form Input Elements
const inputId = document.getElementById('tool-id');
const inputUrl = document.getElementById('tool-url');
const inputName = document.getElementById('tool-name');
const inputIconUrl = document.getElementById('tool-icon-url');
const inputDescription = document.getElementById('tool-description');

// Preview Card Elements
const previewImg = document.getElementById('preview-card-img');
const previewFallback = document.getElementById('preview-card-fallback');
const previewTitle = document.getElementById('preview-card-title');
const previewDesc = document.getElementById('preview-card-desc');
const previewUrl = document.getElementById('preview-card-url');

// -------------------------------------------------------------
// Initialization & Data Loading
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  loadTools();
  setupEventListeners();
});

// Load links from Server API or LocalStorage fallback
async function loadTools() {
  try {
    const response = await fetch('/api/links');
    if (response.ok) {
      tools = await response.json();
      localStorage.setItem('devhub_links', JSON.stringify(tools));
    } else {
      throw new Error('API server returned error');
    }
  } catch (err) {
    console.warn('API connection failed. Falling back to localStorage.', err);
    const localData = localStorage.getItem('devhub_links');
    if (localData) {
      tools = JSON.parse(localData);
    } else {
      // Fallback defaults if no local data
      tools = [
        {
          "id": "github",
          "title": "GitHub",
          "description": "Collaborative software development, code hosting, and version control.",
          "url": "https://github.com",
          "icon": "https://github.githubassets.com/favicons/favicon.svg"
        },
        {
          "id": "jira",
          "title": "Jira Software",
          "description": "Sprint planning, issue tracking, and agile project management.",
          "url": "https://jira.atlassian.com",
          "icon": "https://wac-cdn.atlassian.com/assets/img/favicons/atlassian/favicon.png"
        },
        {
          "id": "grafana",
          "title": "Grafana Dashboards",
          "description": "Operational dashboards, performance analytics, and log monitoring.",
          "url": "https://grafana.com",
          "icon": "https://grafana.com/static/img/favicons/favicon.ico"
        },
        {
          "id": "sentry",
          "title": "Sentry",
          "description": "Application monitoring, error tracking, and performance diagnostics.",
          "url": "https://sentry.io",
          "icon": "https://sentry.io/favicon.ico"
        }
      ];
      localStorage.setItem('devhub_links', JSON.stringify(tools));
    }
  }
  renderTools(tools);
}

// Save tools array to backend server and local storage
async function saveTools() {
  localStorage.setItem('devhub_links', JSON.stringify(tools));
  try {
    const response = await fetch('/api/links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tools)
    });
    if (!response.ok) {
      console.error('Failed to save tools on server');
    }
  } catch (err) {
    console.error('Network error saving tools to server:', err);
  }
}

// -------------------------------------------------------------
// UI Rendering
// -------------------------------------------------------------
function renderTools(toolsListToRender) {
  toolsGrid.innerHTML = '';
  
  if (toolsListToRender.length === 0) {
    emptyState.classList.remove('hidden');
    toolsGrid.classList.add('hidden');
    return;
  }
  
  emptyState.classList.add('hidden');
  toolsGrid.classList.remove('hidden');

  toolsListToRender.forEach((tool, index) => {
    const card = createToolCard(tool, index);
    toolsGrid.appendChild(card);
  });

  // Re-initialize Lucide icons for dynamically added HTML
  if (window.lucide) {
    lucide.createIcons();
  }
}

// Helper to create a single tool card DOM element
function createToolCard(tool, index) {
  const card = document.createElement('div');
  card.className = 'tool-card';
  card.setAttribute('draggable', 'true');
  card.setAttribute('data-id', tool.id);
  card.setAttribute('data-index', index);

  // Set card color theme dynamically based on title
  const gradIndex = getGradientIndex(tool.title) % GRADIENTS.length;
  const grad = GRADIENTS[gradIndex];
  card.style.setProperty('--card-grad-start', grad.start);
  card.style.setProperty('--card-grad-end', grad.end);
  card.style.setProperty('--card-grad-rgb', grad.rgb);

  // Setup click action: opens the tool in a new tab
  card.addEventListener('click', (e) => {
    // Prevent triggering launch when action buttons or drag handle are clicked
    if (e.target.closest('.action-btn') || e.target.closest('.drag-handle')) {
      return;
    }
    window.open(tool.url, '_blank', 'noopener,noreferrer');
  });

  // Resolve favicon / title initial fallback
  const firstLetter = tool.title ? tool.title.trim().charAt(0) : '?';
  const displayUrl = getDisplayUrl(tool.url);

  card.innerHTML = `
    <!-- Drag Handle -->
    <div class="drag-handle" title="Drag to reorder">
      <i data-lucide="grip-vertical"></i>
    </div>
    
    <div class="card-header">
      <div class="card-icon-container">
        <img src="${escapeHtml(tool.icon || '')}" alt="${escapeHtml(tool.title)}" class="${tool.icon ? '' : 'hidden'}" onerror="handleImageError(this, '${escapeHtml(firstLetter)}')">
        <div class="icon-fallback ${tool.icon ? 'hidden' : ''}">${escapeHtml(firstLetter)}</div>
      </div>
      <div class="card-actions">
        <button class="action-btn edit-btn" title="Edit tool details" data-id="${tool.id}">
          <i data-lucide="edit-3"></i>
        </button>
        <button class="action-btn delete-btn" title="Remove tool" data-id="${tool.id}">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    </div>
    
    <div class="card-body">
      <h3>${escapeHtml(tool.title)}</h3>
      <p class="card-desc" title="${escapeHtml(tool.description || '')}">${escapeHtml(tool.description || 'No description provided.')}</p>
    </div>
    
    <div class="card-footer">
      <span class="card-url" title="${escapeHtml(tool.url)}">${escapeHtml(displayUrl)}</span>
      <i data-lucide="external-link" class="launch-icon"></i>
    </div>
  `;

  // Action Buttons handlers
  card.querySelector('.edit-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    openEditModal(tool.id);
  });

  card.querySelector('.delete-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    deleteTool(tool.id);
  });

  // Drag and Drop Listeners
  setupDragAndDropEvents(card);

  return card;
}

// -------------------------------------------------------------
// Drag & Drop Sorting Implementation
// -------------------------------------------------------------
function setupDragAndDropEvents(card) {
  card.addEventListener('dragstart', handleDragStart, false);
  card.addEventListener('dragenter', handleDragEnter, false);
  card.addEventListener('dragover', handleDragOver, false);
  card.addEventListener('dragleave', handleDragLeave, false);
  card.addEventListener('drop', handleDrop, false);
  card.addEventListener('dragend', handleDragEnd, false);
}

function handleDragStart(e) {
  this.classList.add('dragging');
  dragSrcEl = this;
  
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', this.getAttribute('data-id'));
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault(); // Necessary for drop targets
  }
  e.dataTransfer.dropEffect = 'move';
  
  if (this !== dragSrcEl) {
    this.classList.add('drag-over');
  }
  return false;
}

function handleDragEnter(e) {
  // Visual effects
}

function handleDragLeave(e) {
  this.classList.remove('drag-over');
}

function handleDrop(e) {
  e.stopPropagation();
  e.preventDefault();

  this.classList.remove('drag-over');

  if (dragSrcEl !== this) {
    const fromId = e.dataTransfer.getData('text/plain');
    const toId = this.getAttribute('data-id');
    
    // Find index elements
    const fromIndex = tools.findIndex(t => t.id === fromId);
    const toIndex = tools.findIndex(t => t.id === toId);
    
    if (fromIndex !== -1 && toIndex !== -1) {
      // Reorder array
      const draggedItem = tools.splice(fromIndex, 1)[0];
      tools.splice(toIndex, 0, draggedItem);
      
      // Save and re-render
      saveTools();
      renderTools(tools);
    }
  }
  return false;
}

function handleDragEnd(e) {
  this.classList.remove('dragging');
  
  // Clean up any stray classes
  const cards = document.querySelectorAll('.tool-card');
  cards.forEach(card => {
    card.classList.remove('drag-over');
    card.classList.remove('dragging');
  });
}

// -------------------------------------------------------------
// Modal Logic & Metadata Fetching
// -------------------------------------------------------------
function openAddModal() {
  toolForm.reset();
  inputId.value = '';
  modalTitle.textContent = 'Add Internal Tool';
  
  // Clear preview card
  updateLivePreview();
  
  toolModal.classList.remove('hidden');
  inputUrl.focus();
}

// Update live preview card color theme as well
function updateLivePreviewTheme(title) {
  const gradIndex = getGradientIndex(title || 'Tool Title') % GRADIENTS.length;
  const grad = GRADIENTS[gradIndex];
  
  const previewCard = document.querySelector('.preview-card');
  if (previewCard) {
    previewCard.style.setProperty('--card-grad-start', grad.start);
    previewCard.style.setProperty('--card-grad-end', grad.end);
    previewCard.style.setProperty('--card-grad-rgb', grad.rgb);
  }
}

function openEditModal(id) {
  const tool = tools.find(t => t.id === id);
  if (!tool) return;

  inputId.value = tool.id;
  inputUrl.value = tool.url;
  inputName.value = tool.title;
  inputIconUrl.value = tool.icon || '';
  inputDescription.value = tool.description || '';

  modalTitle.textContent = 'Edit Internal Tool';
  updateLivePreview();
  
  toolModal.classList.remove('hidden');
  inputName.focus();
}

function closeModal() {
  toolModal.classList.add('hidden');
}

// Fetch Title, Description, and Icon from URL
async function fetchMetadata() {
  let url = inputUrl.value.trim();
  if (!url) return;

  // Add https:// prefix if missing
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
    inputUrl.value = url;
  }

  // Validate basic format
  try {
    new URL(url);
  } catch (err) {
    alert('Please enter a valid URL.');
    return;
  }

  // Show loading spinner
  const btnText = btnFetchMeta.querySelector('.btn-text');
  const spinner = btnFetchMeta.querySelector('.btn-spinner');
  btnFetchMeta.disabled = true;
  btnText.textContent = 'Fetching...';
  spinner.classList.remove('hidden');

  try {
    const res = await fetch(`/api/metadata?url=${encodeURIComponent(url)}`);
    if (res.ok) {
      const data = await res.json();
      
      const isNew = !inputId.value;
      
      if (isNew || !inputName.value) {
        inputName.value = data.title || '';
      }
      if (isNew || !inputDescription.value) {
        inputDescription.value = data.description || '';
      }
      if (isNew || !inputIconUrl.value) {
        inputIconUrl.value = data.icon || '';
      }

      updateLivePreview();
    } else {
      console.error('Failed to parse page details');
    }
  } catch (err) {
    console.error('Error fetching site info:', err);
  } finally {
    // Clear loading spinner
    btnFetchMeta.disabled = false;
    btnText.textContent = 'Fetch Info';
    spinner.classList.add('hidden');
  }
}

// Live preview synchronization
function updateLivePreview() {
  const url = inputUrl.value.trim();
  const name = inputName.value.trim() || 'Tool Title';
  const icon = inputIconUrl.value.trim();
  const desc = inputDescription.value.trim() || 'No description provided yet.';
  
  previewTitle.textContent = name;
  previewDesc.textContent = desc;
  previewUrl.textContent = url ? getDisplayUrl(url) : 'example.com';
  
  const firstLetter = name.charAt(0);
  
  // Set theme colors of the preview card
  updateLivePreviewTheme(name);
  
  if (icon) {
    previewImg.src = icon;
    previewImg.classList.remove('hidden');
    previewFallback.classList.add('hidden');
  } else {
    previewImg.classList.add('hidden');
    previewFallback.textContent = firstLetter;
    previewFallback.classList.remove('hidden');
  }
}

// Save tool from modal form
async function handleFormSubmit(e) {
  e.preventDefault();

  let url = inputUrl.value.trim();
  const name = inputName.value.trim();
  const icon = inputIconUrl.value.trim();
  const desc = inputDescription.value.trim();
  const id = inputId.value;

  if (!url || !name) {
    alert('Please fill out all required fields.');
    return;
  }

  // Prepend https:// if not existing
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  const toolData = {
    id: id || 'tool-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
    title: name,
    description: desc,
    url: url,
    icon: icon
  };

  if (id) {
    // Edit mode
    const index = tools.findIndex(t => t.id === id);
    if (index !== -1) {
      tools[index] = toolData;
    }
  } else {
    // Add mode
    tools.push(toolData);
  }

  await saveTools();
  renderTools(tools);
  closeModal();
}

// Delete Tool
async function deleteTool(id) {
  const tool = tools.find(t => t.id === id);
  if (!tool) return;

  const confirmed = confirm(`Are you sure you want to delete "${tool.title}"?`);
  if (!confirmed) return;

  tools = tools.filter(t => t.id !== id);
  await saveTools();
  renderTools(tools);
}

// -------------------------------------------------------------
// Event Listeners & Helpers
// -------------------------------------------------------------
function setupEventListeners() {
  // Fab button trigger add
  fabAddBtn.addEventListener('click', openAddModal);
  emptyAddBtn.addEventListener('click', openAddModal);
  
  // Close triggers
  modalCloseBtn.addEventListener('click', closeModal);
  btnModalCancel.addEventListener('click', closeModal);
  
  // Click outside modal content closes it
  toolModal.addEventListener('click', (e) => {
    if (e.target === toolModal) {
      closeModal();
    }
  });

  // Modal manual fetch info button
  btnFetchMeta.addEventListener('click', fetchMetadata);

  // Auto fetch metadata on input blur (lose focus)
  inputUrl.addEventListener('blur', () => {
    const url = inputUrl.value.trim();
    if (url && !inputName.value) {
      fetchMetadata();
    }
  });

  // Sync inputs with live preview
  inputUrl.addEventListener('input', updateLivePreview);
  inputName.addEventListener('input', updateLivePreview);
  inputIconUrl.addEventListener('input', updateLivePreview);
  inputDescription.addEventListener('input', updateLivePreview);
  
  // Preview image error handling
  previewImg.addEventListener('error', () => {
    previewImg.classList.add('hidden');
    previewFallback.textContent = (inputName.value || 'T').trim().charAt(0);
    previewFallback.classList.remove('hidden');
  });

  // Form submit
  toolForm.addEventListener('submit', handleFormSubmit);

  // Search filter keypress listener
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (!query) {
      renderTools(tools);
      return;
    }

    const filtered = tools.filter(tool => {
      return (
        tool.title.toLowerCase().includes(query) ||
        (tool.description && tool.description.toLowerCase().includes(query)) ||
        tool.url.toLowerCase().includes(query)
      );
    });
    
    renderTools(filtered);
  });

  // Shortcut key '/' to focus search, Escape to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== searchInput && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
    
    if (e.key === 'Escape' && !toolModal.classList.contains('hidden')) {
      closeModal();
    }
  });
}

// Standard helper to handle loaded image error
window.handleImageError = function(imgElement, fallbackLetter) {
  imgElement.classList.add('hidden');
  const container = imgElement.parentElement;
  if (container) {
    const fallbackDiv = container.querySelector('.icon-fallback');
    if (fallbackDiv) {
      fallbackDiv.textContent = fallbackLetter;
      fallbackDiv.classList.remove('hidden');
    }
  }
};

// Extractor helper to show domain.com on card footer
function getDisplayUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    return url.hostname.replace(/^www\./i, '');
  } catch (err) {
    return urlStr;
  }
}

// Simple HTML escaping to prevent XSS
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
