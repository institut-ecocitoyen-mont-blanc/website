const DEPLOY_HOOK_PROPERTY = "CLOUDFLARE_PAGES_DEPLOY_HOOK";
const LAST_DEPLOY_PROPERTY = "CLOUDFLARE_PAGES_LAST_DEPLOY_AT";
const DEPLOY_COOLDOWN_MS = 60 * 1000;

/**
 * Calls the Cloudflare Pages Deploy Hook after a spreadsheet edit or
 * structural change. This must be registered as an installable trigger so
 * UrlFetchApp is authorized.
 */
function triggerCloudflarePagesDeploy() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;

  try {
    const properties = PropertiesService.getScriptProperties();
    const deployHookUrl = properties.getProperty(DEPLOY_HOOK_PROPERTY);

    if (!deployHookUrl) {
      throw new Error(
        `Missing script property: ${DEPLOY_HOOK_PROPERTY}`,
      );
    }

    const now = Date.now();
    const lastDeployAt = Number(
      properties.getProperty(LAST_DEPLOY_PROPERTY) || 0,
    );

    if (now - lastDeployAt < DEPLOY_COOLDOWN_MS) return;

    const response = UrlFetchApp.fetch(deployHookUrl, {
      method: "post",
      muteHttpExceptions: true,
    });
    const status = response.getResponseCode();

    if (status < 200 || status >= 300) {
      throw new Error(
        `Cloudflare deploy hook failed with status ${status}: ${response.getContentText()}`,
      );
    }

    properties.setProperty(LAST_DEPLOY_PROPERTY, String(now));
  } finally {
    lock.releaseLock();
  }
}

/**
 * Installs value-edit and structural-change triggers on the bound spreadsheet.
 * Run this function once from the Apps Script editor and approve its scopes.
 */
function installCloudflarePagesTriggers() {
  const spreadsheet = SpreadsheetApp.getActive();

  ScriptApp.getProjectTriggers()
    .filter(
      (trigger) =>
        trigger.getHandlerFunction() === "triggerCloudflarePagesDeploy",
    )
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger("triggerCloudflarePagesDeploy")
    .forSpreadsheet(spreadsheet)
    .onEdit()
    .create();

  ScriptApp.newTrigger("triggerCloudflarePagesDeploy")
    .forSpreadsheet(spreadsheet)
    .onChange()
    .create();
}

/** Run manually to validate the stored Deploy Hook URL. */
function testCloudflarePagesDeploy() {
  PropertiesService.getScriptProperties().deleteProperty(
    LAST_DEPLOY_PROPERTY,
  );
  triggerCloudflarePagesDeploy();
}
