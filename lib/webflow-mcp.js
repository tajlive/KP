/**
 * Webflow MCP (Model-Context-Protocol) Library
 *
 * Comprehensive wrapper for Webflow API v2
 * Handles pages, collections, items, and publishing
 *
 * Usage:
 *   const WebflowMCP = require('./lib/webflow-mcp');
 *   const webflow = new WebflowMCP(apiToken, siteId);
 *   const pages = await webflow.listPages();
 */

const axios = require('axios');

class WebflowMCP {
  constructor(apiToken, siteId) {
    if (!apiToken) {
      throw new Error('WEBFLOW_API_TOKEN is required');
    }
    if (!siteId) {
      throw new Error('WEBFLOW_SITE_ID is required');
    }

    this.apiToken = apiToken;
    this.siteId = siteId;
    this.baseUrl = 'https://api.webflow.com/v2';

    // Configure axios instance
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        'accept-version': '1.0.0'
      },
      timeout: 30000 // 30 second timeout
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🌐 ${config.method.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          console.error(`❌ API Error: ${error.response.status} - ${error.response.data?.message || error.message}`);
        } else {
          console.error(`❌ Network Error: ${error.message}`);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get site information
   * @returns {Promise<Object>} Site info
   */
  async getSiteInfo() {
    try {
      const response = await this.client.get(`/sites/${this.siteId}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * List all pages in the site
   * @returns {Promise<Object>} List of pages
   */
  async listPages() {
    try {
      const response = await this.client.get(`/sites/${this.siteId}/pages`);
      return {
        success: true,
        pages: response.data.pages || [],
        total: response.data.pages?.length || 0
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
        pages: []
      };
    }
  }

  /**
   * Get a specific page by slug
   * @param {string} slug - Page slug
   * @returns {Promise<Object>} Page data
   */
  async getPage(slug) {
    try {
      const listResult = await this.listPages();
      if (!listResult.success) {
        return listResult;
      }

      const page = listResult.pages.find(p => p.slug === slug);
      if (!page) {
        return {
          success: false,
          error: `Page with slug "${slug}" not found`
        };
      }

      return {
        success: true,
        data: page
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create a new page
   * @param {Object} pageData - Page configuration
   * @param {string} pageData.slug - URL slug
   * @param {string} pageData.name - Display name
   * @param {string} pageData.title - Page title (meta)
   * @param {string} [pageData.description] - Meta description
   * @param {boolean} [pageData.isHomePage] - Is this the home page?
   * @returns {Promise<Object>} Created page
   */
  async createPage(pageData) {
    try {
      const {
        slug,
        name,
        title,
        description = '',
        isHomePage = false
      } = pageData;

      if (!slug || !name || !title) {
        return {
          success: false,
          error: 'slug, name, and title are required'
        };
      }

      // Check if page already exists
      const existingPage = await this.getPage(slug);
      if (existingPage.success) {
        console.log(`⏭️  Page "${slug}" already exists, skipping creation`);
        return {
          success: true,
          skipped: true,
          data: existingPage.data
        };
      }

      const payload = {
        siteId: this.siteId,
        slug,
        name,
        title,
        ...(description && { description }),
        ...(isHomePage && { isHomePage: true })
      };

      const response = await this.client.post(`/sites/${this.siteId}/pages`, payload);

      return {
        success: true,
        created: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Update page metadata
   * @param {string} pageId - Page ID
   * @param {Object} metadata - Metadata to update
   * @returns {Promise<Object>} Updated page
   */
  async updatePageMetadata(pageId, metadata) {
    try {
      const response = await this.client.patch(
        `/pages/${pageId}`,
        metadata
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * List all collections
   * @returns {Promise<Object>} List of collections
   */
  async listCollections() {
    try {
      const response = await this.client.get(`/sites/${this.siteId}/collections`);
      return {
        success: true,
        collections: response.data.collections || []
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
        collections: []
      };
    }
  }

  /**
   * Get collection items
   * @param {string} collectionId - Collection ID
   * @param {number} [limit=100] - Max items to return
   * @param {number} [offset=0] - Offset for pagination
   * @returns {Promise<Object>} Collection items
   */
  async getCollectionItems(collectionId, limit = 100, offset = 0) {
    try {
      const response = await this.client.get(
        `/collections/${collectionId}/items`,
        {
          params: { limit, offset }
        }
      );

      return {
        success: true,
        items: response.data.items || [],
        total: response.data.total || 0
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
        items: []
      };
    }
  }

  /**
   * Create a collection item
   * @param {string} collectionId - Collection ID
   * @param {Object} fields - Item fields
   * @param {boolean} [isDraft=false] - Create as draft
   * @returns {Promise<Object>} Created item
   */
  async createCollectionItem(collectionId, fields, isDraft = false) {
    try {
      const payload = {
        fields,
        isDraft
      };

      const response = await this.client.post(
        `/collections/${collectionId}/items`,
        payload
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Update a collection item
   * @param {string} collectionId - Collection ID
   * @param {string} itemId - Item ID
   * @param {Object} fields - Fields to update
   * @returns {Promise<Object>} Updated item
   */
  async updateCollectionItem(collectionId, itemId, fields) {
    try {
      const payload = { fields };

      const response = await this.client.patch(
        `/collections/${collectionId}/items/${itemId}`,
        payload
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Delete a collection item
   * @param {string} collectionId - Collection ID
   * @param {string} itemId - Item ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteCollectionItem(collectionId, itemId) {
    try {
      await this.client.delete(
        `/collections/${collectionId}/items/${itemId}`
      );

      return {
        success: true,
        message: 'Item deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Publish site to specified domains
   * @param {string[]} domains - List of domains to publish to
   * @returns {Promise<Object>} Publish result
   */
  async publishSite(domains = []) {
    try {
      const payload = {
        publishToWebflowSubdomain: domains.length === 0,
        ...(domains.length > 0 && { customDomains: domains })
      };

      const response = await this.client.post(
        `/sites/${this.siteId}/publish`,
        payload
      );

      return {
        success: true,
        data: response.data,
        message: `Site published to ${domains.length > 0 ? domains.join(', ') : 'Webflow subdomain'}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Get site's custom domains
   * @returns {Promise<Object>} List of domains
   */
  async getDomains() {
    try {
      const response = await this.client.get(`/sites/${this.siteId}/domains`);
      return {
        success: true,
        domains: response.data.domains || []
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
        domains: []
      };
    }
  }

  /**
   * Batch create multiple pages
   * @param {Array<Object>} pagesData - Array of page configurations
   * @returns {Promise<Object>} Results for all pages
   */
  async batchCreatePages(pagesData) {
    const results = {
      success: [],
      skipped: [],
      failed: []
    };

    for (const pageData of pagesData) {
      const result = await this.createPage(pageData);

      if (result.success) {
        if (result.skipped) {
          results.skipped.push({
            slug: pageData.slug,
            name: pageData.name
          });
        } else {
          results.success.push({
            slug: pageData.slug,
            name: pageData.name,
            id: result.data.id
          });
        }
      } else {
        results.failed.push({
          slug: pageData.slug,
          name: pageData.name,
          error: result.error
        });
      }
    }

    return {
      success: results.failed.length === 0,
      created: results.success.length,
      skipped: results.skipped.length,
      failed: results.failed.length,
      details: results
    };
  }
}

module.exports = WebflowMCP;
