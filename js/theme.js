$(document).ready(function () {
    $('#toggleTheme').on('change', function () {
        // Kiểm tra trạng thái của checkbox
        if ($(this).is(':checked')) {
            $('html').attr('data-bs-theme', 'dark'); // Chuyển sang chế độ tối
        } else {
            $('html').removeAttr('data-bs-theme'); // Chuyển về chế độ sáng
        }
    });

    // Khôi phục trạng thái từ localStorage nếu có
    const savedTheme = localStorage.getItem('theme');
    $('html').attr('data-bs-theme', savedTheme === 'dark' ? 'dark' : '');
    $('#toggleTheme').prop('checked', savedTheme === 'dark');

    // Lưu trạng thái chế độ vào localStorage
    $('#toggleTheme').on('change', function () {
        if ($(this).is(':checked')) {
            localStorage.setItem('theme', 'dark');
        } else {
            localStorage.removeItem('theme');
        }
    });
});