const translations = {
  en: {
    dashboard: 'Dashboard',
    kanban: 'Kanban Board',
    allTasks: 'All Tasks',
    settings: 'User Settings',
    logout: 'Logout',
    add_task: 'Add Task',
    todo: 'To Do',
    in_progress: 'In Progress',
    done: 'Done',
    language: 'Language',
    theme: 'Theme',
    username: 'Username',
    avatar_color: 'Avatar Color',
    save_changes: 'Save Changes',
    search: 'Search tasks...',
    priority: 'Priority',
    urgent: 'Urgent',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    categories: 'Categories',
    productivity: 'Productivity',
    focus_timer: 'Focus Timer'
  },
  es: {
    dashboard: 'Tablero',
    kanban: 'Tablero Kanban',
    allTasks: 'Todas las tareas',
    settings: 'Ajustes de usuario',
    logout: 'Cerrar sesión',
    add_task: 'Agregar tarea',
    todo: 'Por hacer',
    in_progress: 'En progreso',
    done: 'Hecho',
    language: 'Idioma',
    theme: 'Tema',
    username: 'Nombre de usuario',
    avatar_color: 'Color de avatar',
    save_changes: 'Guardar cambios',
    search: 'Buscar tareas...',
    priority: 'Prioridad',
    urgent: 'Urgente',
    high: 'Alta',
    medium: 'Media',
    low: 'Baja',
    categories: 'Categorías',
    productivity: 'Productividad',
    focus_timer: 'Temporizador'
  },
  fr: {
    dashboard: 'Tableau de bord',
    kanban: 'Tableau Kanban',
    allTasks: 'Toutes les tâches',
    settings: 'Paramètres',
    logout: 'Déconnexion',
    add_task: 'Ajouter une tâche',
    todo: 'À faire',
    in_progress: 'En cours',
    done: 'Terminé',
    language: 'Langue',
    theme: 'Thème',
    username: 'Nom d\'utilisateur',
    avatar_color: 'Couleur de l\'avatar',
    save_changes: 'Enregistrer',
    search: 'Rechercher...',
    priority: 'Priorité',
    urgent: 'Urgent',
    high: 'Haute',
    medium: 'Moyenne',
    low: 'Basse',
    categories: 'Catégories',
    productivity: 'Productivité',
    focus_timer: 'Minuteur'
  },
  hi: {
    dashboard: 'डैशबोर्ड',
    kanban: 'कानबन बोर्ड',
    allTasks: 'सभी कार्य',
    settings: 'उपयोगकर्ता सेटिंग्स',
    logout: 'लॉगआउट',
    add_task: 'कार्य जोड़ें',
    todo: 'करने के लिए',
    in_progress: 'प्रगति पर है',
    done: 'हो गया',
    language: 'भाषा',
    theme: 'थीम',
    username: 'उपयोगकर्ता नाम',
    avatar_color: 'अवतार रंग',
    save_changes: 'बदलाव सहेजें',
    search: 'कार्य खोजें...',
    priority: 'प्राथमिकता',
    urgent: 'अति आवश्यक',
    high: 'उच्च',
    medium: 'मध्यम',
    low: 'निम्न',
    categories: 'श्रेणियां',
    productivity: 'उत्पादकता',
    focus_timer: 'फोकस टाइमर'
  }
};

window.I18N = {
  current: localStorage.getItem('tm_lang') || 'en',
  t(key) {
    return translations[this.current][key] || translations['en'][key] || key;
  },
  setLang(lang) {
    if (translations[lang]) {
      this.current = lang;
      localStorage.setItem('tm_lang', lang);
      location.reload(); // Simple way to re-render everything
    }
  }
};
