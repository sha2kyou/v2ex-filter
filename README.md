# V2EX Topic Filter

A browser extension that filters V2EX topics based on user-defined criteria using an AI model (specifically, Bailian AI). This extension helps you hide "useless" or irrelevant topics from your V2EX feed, allowing for a cleaner browsing experience.

## Features

*   **AI-Powered Filtering:** Utilizes Bailian AI to analyze topic titles and determine their relevance.
*   **Customizable Criteria:** Define what constitutes "useless" content by customizing the AI prompt. The default criteria include:
    *   Purely emotional expressions (e.g., rants, complaints).
    *   Trivial family matters that don't require specific knowledge.
*   **Toggle Filtering:** Easily enable or disable topic filtering from the extension's popup.
*   **API Key Management:** Securely store and manage your Bailian AI API key within the extension.
*   **Hidden Topics List:** View a list of topics that have been hidden by the filter.
*   **Cache Clearing:** Clear the extension's cache for fresh filtering results.

## Installation

To install this extension, follow these steps:

1.  **Download:** Clone or download this repository to your local machine.
2.  **Open Extension Management:**
    *   **Chrome/Brave/Edge:** Go to `chrome://extensions` (or `brave://extensions`, `edge://extensions`).
    *   **Firefox:** Go to `about:addons`, then click on the gear icon and select "Debug Add-ons".
3.  **Load Unpacked:**
    *   Enable "Developer mode" (usually a toggle in the top right corner).
    *   Click on "Load unpacked" (or "Load Temporary Add-on" for Firefox).
    *   Select the directory where you downloaded/cloned this repository.
4.  **Configure:**
    *   Click on the extension icon in your browser toolbar.
    *   Enter your Bailian AI API key in the settings.
    *   (Optional) Customize the AI prompt to refine filtering criteria.
    *   Ensure the filter is enabled.

## Usage

Once installed and configured:

1.  Navigate to [V2EX](https://www.v2ex.com/).
2.  The extension will automatically filter topics based on your settings.
3.  Click the extension icon to:
    *   Toggle filtering on/off.
    *   Access settings (API key, custom prompt).
    *   View hidden topics.
    *   Clear the cache.

## Project Structure

*   `manifest.json`: The manifest file for the browser extension, defining its properties and permissions.
*   `background.js`: Handles background tasks, including communication with the AI service and managing cached results.
*   `content.js`: Injects into V2EX pages to hide/show topics based on filtering results.
*   `popup.html`: The HTML structure for the extension's popup interface.
*   `popup.css`: Styles for the popup interface.
*   `popup.js`: Handles the logic and interactivity of the popup interface, including settings management.
*   `images/`: Contains icons used by the extension.

## Contributing

Contributions are welcome! Please feel free to open issues or submit pull requests.

## License

[Specify your license here, e.g., MIT, Apache 2.0, etc.]
