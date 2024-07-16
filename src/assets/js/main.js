const API = [
    'https://script.google.com/macros/s/AKfycbzcw3_ujuH04arRj1KLI2j0yXQE8jUb5POHBFPi0NAfZEBAaKe9AcwvxyahI3stGwrh2A/exec',
    'https://script.google.com/macros/s/AKfycbxEmmZFo2qYKuasmbnptS7K4umOy2PsCMe3F2uF13OqUZBdeY5ziTc00GyvoN2PtaV7kA/exec',
    'https://script.google.com/macros/s/AKfycbxZhcRkfbT_86cWh5_B4jF9aXCjTIbjCpsbZga_TafiAF4zLUupy0w_MO2ta8h2pvr-/exec'
]

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
        script: urlPage + 'assets/js/translate.js',
        content: '#page-translate_content',
        showTextInput: true,
        showTextOutput: true
    },
    update: {
        isLoad: false,
        isShow: false,
        url: urlPage + 'views/update.hbs',
        script: 'assets/js/update.js',
        content: '#page-update_content',
        showTextInput: false,
        showTextOutput: true
    },
    currentPage: 'translate'
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

    pages.currentPage = pageKey;
    localStorage.setItem("pages", JSON.stringify(pages));
}

$('#page-translate').click(function () {
    showPage('translate');
    $('#btnTranslateGroup').removeClass('d-none');
    $('#btnUpdateGroup').addClass('d-none');
});

$('#page-update').click(function () {
    showPage('update');
    $('#btnTranslateGroup').addClass('d-none');
    $('#btnUpdateGroup').removeClass('d-none');
});

function loadOptionsTranslate() {
    fetch(urlPage + 'views/options.hbs')
        .then(response => response.text())
        .then(template => {
            const compiledTemplate = Handlebars.compile(template);
            $('#page-options_content').html(compiledTemplate());

            const currentPage = JSON.parse(localStorage.getItem("pages"))?.currentPage || 'translate';
            // const currentPage = 'translate';
            $(`#page-${currentPage}`).click()
        });
} loadOptionsTranslate();


var isTauri = window.__TAURI__ !== undefined;

if (isTauri) {
    $(document).on('contextmenu', function (e) {
        e.preventDefault();
    });
} 