org.ekstep.contentrenderer.baseLauncher.extend({
    _manifest: undefined,
    CURRENT_PAGE: undefined,
    CANVAS: undefined,
    TOTAL_PAGES: undefined,
    PAGE_RENDERING_IN_PROGRESS: undefined,
    PDF_DOC: undefined,
    CANVAS_CTX: undefined,
    context: undefined,
    stageId: [],
    heartBeatData: {},
    enableHeartBeatEvent: true,
    headerTimer: undefined,
    _constants: {
        mimeType: ["application/pdf"],
        events: {
            launchEvent: "renderer:launch:pdf"
        }
    },
    initLauncher: function(manifestData) {
        console.info('PDF Renderer init', manifestData)
        EkstepRendererAPI.addEventListener(this._constants.events.launchEvent, this.start, this);
        this._manifest = manifestData;
    },
    start: function() {
        this._super();
        context = this;
        var data = _.clone(content);
        this.initContentProgress();
        var path = undefined;
        var globalConfigObj = EkstepRendererAPI.getGlobalConfig();
        if (window.cordova || !isbrowserpreview) {
            var regex = new RegExp("^(http|https)://", "i");
            if(!regex.test(globalConfigObj.basepath)){
                var prefix_url = globalConfigObj.basepath || '';
                path = prefix_url + "/" + data.artifactUrl + "?" + new Date().getSeconds();
            }else   
                path = data.streamingUrl;
        } else {
            path = data.artifactUrl + "?" + new Date().getSeconds();
        }
        console.log("path pdf is ", path);
        var div = document.createElement('div');
        div.src = path;
        context.addToGameArea(div);
        context.renderPDF(path, document.getElementById(this.manifest.id), this.manifest);
    },
    replay: function() {
        if (this.sleepMode) return;
        this._super();
    },
    renderPDF: function(path, canvasContainer) {
        EkstepRendererAPI.dispatchEvent("renderer:splash:hide");
        var iframe = document.createElement('iframe');
        iframe.width = '100%';
        iframe.height = '100%';
        iframe.src = './coreplugins/org.ekstep.pdfrenderer-1.0/renderer/libs/viewer/web/viewer.html';
        
        canvasContainer.appendChild(iframe);

        context.PDF_DOC = 0;
        context.CURRENT_PAGE = 0;
        context.TOTAL_PAGES = 0;
        context.PAGE_RENDERING_IN_PROGRESS = 0;

        this.heartBeatData.stageId = context.CURRENT_PAGE.toString();
    },

    initContentProgress: function() {
        var instance = this;
        EkstepRendererAPI.addEventListener("sceneEnter", function(event) {
            if (this.sleepMode) return;
            instance.stageId.push(event.target.CURRENT_PAGE);
        });
    },
    contentProgress: function() {
        var totalStages = this.TOTAL_PAGES;
        var currentStageIndex = _.size(_.uniq(this.stageId)) || 1;
        return this.progres(currentStageIndex, totalStages);
    },
    logInteractEvent: function(type, id, extype, eks, eid){
        window.PLAYER_STAGE_START_TIME = Date.now()/1000;
        EkstepRendererAPI.getTelemetryService().interact(type, id, extype, eks,eid);
    },
    logImpressionEvent: function(stageId, stageTo){
        EkstepRendererAPI.getTelemetryService().navigate(stageId, stageTo, {
            "duration": (Date.now()/1000) - window.PLAYER_STAGE_START_TIME
        });
    }
});

//# sourceURL=PDFRenderer.js