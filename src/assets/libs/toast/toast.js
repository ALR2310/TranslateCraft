function toast({ title = '', message = '', type = 'info', duration = 3000 }) {
    const main = document.getElementById('toast');

    if (main) {
        const toast = document.createElement('div');

        //Auto remove toast
        const autoRemoveId = setTimeout(function () {
            main.removeChild(toast);
        }, duration + 1000);

        //Remove toast when click
        toast.onclick = function (e) {
            if (e.target.closest('.toast__close')) {
                main.removeChild(toast);
                clearTimeout(autoRemoveId);
            };
        };

        const icons = {
            success: 'fas fa-check-circle',
            info: 'fas fa-info-circle',
            warning: 'fas fa-exclamation-circle',
            error: 'fas fa-times-circle'
        }
        const icon = icons[type];
        const delay = (duration / 1000).toFixed(2);

        toast.classList.add('toast', 'show', `toast--${type}`);
        toast.style.animation = `slideInLeft 0.4s ease, fadeOut linear 1s ${delay}s forwards`;
        toast.innerHTML = `
            <div class="toast__icon">
                <i class="${icon}"></i>
            </div>
            <div class="toast__body">
                <h3 class="toast__title">${title}</h3>
                <p class="toast__message">${message}</p>
            </div>
            <div class="toast__close">
                <i class="fas fa-times"></i>
            </div>
        `;
        main.appendChild(toast);
    }
}

function showSuccessToast(message) {
    toast({
        title: 'Thành Công',
        message: message || 'Bạn đã đăng ký tài khoản thành công',
        type: 'success',
        duration: 5000
    });
}
function showInfoToast(message) {
    toast({
        title: 'Thông tin',
        message: message || 'Có thông báo mới được gửi đến hộp thư',
        type: 'info',
        duration: 5000
    });
}
function showWarningToast(message) {
    toast({
        title: 'Cảnh Báo',
        message: message || 'Các trường dữ liệu không được để trống',
        type: 'warning',
        duration: 5000
    });
}
function showErrorToast(message) {
    toast({
        title: 'Thất Bại',
        message: message || 'Có lỗi đã xảy ra trong quá trình đăng ký, vui lòng thử lại',
        type: 'error',
        duration: 5000
    });
}