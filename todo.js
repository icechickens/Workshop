document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の取得
    const todoInput = document.getElementById('todo-input');
    const addButton = document.getElementById('add-button');
    const todoList = document.getElementById('todo-list');
    const itemsLeft = document.getElementById('items-left');
    const clearCompletedButton = document.getElementById('clear-completed');
    const allFilterButton = document.getElementById('all-filter');
    const activeFilterButton = document.getElementById('active-filter');
    const completedFilterButton = document.getElementById('completed-filter');
    
    // 現在のフィルター状態
    let currentFilter = 'all';
    
    // ローカルストレージからToDoアイテムを取得
    let todos = JSON.parse(localStorage.getItem('todos')) || [];
    
    // 初期表示
    renderTodos();
    updateItemsLeft();
    
    // ToDoアイテムの追加
    function addTodo() {
        const todoText = todoInput.value.trim();
        
        if (todoText) {
            const newTodo = {
                id: Date.now(),
                text: todoText,
                completed: false
            };
            
            todos.push(newTodo);
            saveTodos();
            
            todoInput.value = '';
            renderTodos();
            updateItemsLeft();
        }
    }
    
    // Enterキーでも追加できるようにする
    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTodo();
        }
    });
    
    // 追加ボタンのクリックイベント
    addButton.addEventListener('click', addTodo);
    
    // ToDoアイテムの表示
    function renderTodos() {
        // リストをクリア
        todoList.innerHTML = '';
        
        // フィルタリングされたToDoアイテムを取得
        const filteredTodos = filterTodos();
        
        // ToDoアイテムを表示
        filteredTodos.forEach(todo => {
            const todoItem = document.createElement('li');
            todoItem.className = `todo-item ${todo.completed ? 'completed' : ''}`;
            todoItem.dataset.id = todo.id;
            
            todoItem.innerHTML = `
                <input type="checkbox" id="todo-${todo.id}" ${todo.completed ? 'checked' : ''}>
                <label for="todo-${todo.id}">${escapeHtml(todo.text)}</label>
                <button class="delete-btn">×</button>
            `;
            
            todoList.appendChild(todoItem);
            
            // チェックボックスのイベントリスナー
            const checkbox = todoItem.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', () => {
                toggleTodoCompleted(todo.id);
            });
            
            // 削除ボタンのイベントリスナー
            const deleteButton = todoItem.querySelector('.delete-btn');
            deleteButton.addEventListener('click', () => {
                deleteTodo(todo.id);
            });
        });
    }
    
    // HTMLエスケープ処理
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // ToDoアイテムのフィルタリング
    function filterTodos() {
        switch (currentFilter) {
            case 'active':
                return todos.filter(todo => !todo.completed);
            case 'completed':
                return todos.filter(todo => todo.completed);
            default:
                return todos;
        }
    }
    
    // ToDoアイテムの完了状態を切り替え
    function toggleTodoCompleted(id) {
        todos = todos.map(todo => {
            if (todo.id === id) {
                return { ...todo, completed: !todo.completed };
            }
            return todo;
        });
        
        saveTodos();
        renderTodos();
        updateItemsLeft();
    }
    
    // ToDoアイテムの削除
    function deleteTodo(id) {
        todos = todos.filter(todo => todo.id !== id);
        
        saveTodos();
        renderTodos();
        updateItemsLeft();
    }
    
    // 完了済みのToDoアイテムをすべて削除
    clearCompletedButton.addEventListener('click', () => {
        todos = todos.filter(todo => !todo.completed);
        
        saveTodos();
        renderTodos();
        updateItemsLeft();
    });
    
    // フィルターボタンのイベントリスナー
    allFilterButton.addEventListener('click', () => {
        setFilter('all');
    });
    
    activeFilterButton.addEventListener('click', () => {
        setFilter('active');
    });
    
    completedFilterButton.addEventListener('click', () => {
        setFilter('completed');
    });
    
    // フィルターの設定
    function setFilter(filter) {
        currentFilter = filter;
        
        // アクティブなボタンのスタイルを更新
        allFilterButton.classList.toggle('active', filter === 'all');
        activeFilterButton.classList.toggle('active', filter === 'active');
        completedFilterButton.classList.toggle('active', filter === 'completed');
        
        renderTodos();
    }
    
    // 残りのアイテム数を更新
    function updateItemsLeft() {
        const activeCount = todos.filter(todo => !todo.completed).length;
        itemsLeft.textContent = `${activeCount} 個のタスクが残っています`;
    }
    
    // ローカルストレージにToDoアイテムを保存
    function saveTodos() {
        localStorage.setItem('todos', JSON.stringify(todos));
    }
});
