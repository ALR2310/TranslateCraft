function convertPlaceHbs(template, options = { from: { start: "%", end: "%" }, to: { start: "{{", end: "}}" } }) {
    try {
        const { from, to } = options;
        const startRegex = new RegExp(from.start.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '([^]*?)' + from.end.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'g');
        // Tìm các cặp mở và đóng trong template

        return template.replace(startRegex, function (match, p1) {
            // Thực hiện thay thế trong từng cặp
            return to.start + p1.replace(new RegExp(to.start.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'g'), from.start)
                .replace(new RegExp(to.end.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'g'), from.end) + to.end;
        });
    } catch (e) {
        // console.log(e);
    }
}

const urlPage = window.location.origin + window.location.pathname;
let pages = {
    translate: {
        isLoad: false,
        isShow: false,
        url: urlPage + 'views/translate.hbs',
        script: urlPage + 'js/translate.js',
        content: '#page-translate_content'
    },
    update: {
        isLoad: false,
        isShow: false,
        url: urlPage + 'views/update.hbs',
        script: 'js/update.js',
        content: '#page-update_content'
    }
};

function showPage(pageKey) {
    let page = pages[pageKey];
    let otherPageKey = pageKey === 'translate' ? 'update' : 'translate';
    let otherPage = pages[otherPageKey];

    $(`#page-${pageKey}`).find('.nav-link').addClass("active");
    $(`#page-${otherPageKey}`).find('.nav-link').removeClass("active");

    if (page.isLoad) {
        if (page.isShow) return;
        $(page.content).removeClass('d-none');
        $(otherPage.content).addClass('d-none');
    } else {
        if (otherPage.isShow) $(otherPage.content).addClass('d-none');
        fetch(page.url)
            .then(response => response.text())
            .then(template => {
                const compiledTemplate = Handlebars.compile(template);
                $(page.content).html(compiledTemplate());
                $.getScript(page.script);
            });
        page.isLoad = true;
    }
    page.isShow = true;
    otherPage.isShow = false;

    localStorage.setItem("page", pageKey);
}

$('#page-translate').click(function () {
    showPage('translate');
});

$('#page-update').click(function () {
    showPage('update');
});

const currentPage = localStorage.getItem("page");
if (currentPage === "update") $('#page-update').click();
else $('#page-translate').click();

