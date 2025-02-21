'use strict'

const obsidian = require('obsidian')

module.exports = class DataviewAppendPlugin extends obsidian.Plugin {
  async onload() {
    console.log('Loading DataviewAppendPlugin...')
    //  - 在dataview段落后追加
    this.addCommand({
      id: 'append-dataview-content',
      name: 'List Link After Dataview',
      callback: () => this.appendDataviewContent(),
    })

    //  - 在文末追加
    this.addCommand({
      id: 'append-dataview-content-to-end',
      name: 'List Link To End',
      callback: () => this.appendDataviewContentToEnd(),
    })

    // 注册事件监听器,当文档被修改时触发
    this.registerEvent(
      this.app.workspace.on('file-change', () => {
        console.log('File changed, checking for dataview blocks...')
        this.handleFileChange()
      })
    )

    console.log('DataviewAppendPlugin loaded successfully')
  }

  async handleFileChange() {
    const activeView = this.app.workspace.getActiveViewOfType(
      obsidian.MarkdownView
    )
    if (!activeView) {
      console.log('No active markdown view found')
      return
    }

    const file = activeView.file
    if (!file) {
      console.log('No file is currently open')
      return
    }

    console.log(`Processing file: ${file.path}`)
    await this.processDataviewBlocks(file)
  }

  async processDataviewBlocks(file) {
    let content = await this.app.vault.read(file)
    console.log('Reading file content...')

    const dataviewPlugin = this.app.plugins.getPlugin('dataview')
    if (!dataviewPlugin) {
      console.log('Dataview plugin not found')
      return
    }

    const dataviewRegex = /```dataview\n([\s\S]*?)```/g
    let match
    let hasChanges = false

    while ((match = dataviewRegex.exec(content)) !== null) {
      const fullMatch = match[0]
      const dataviewContent = match[1].trim()
      const blockStart = match.index
      const blockEnd = blockStart + fullMatch.length

      console.log('Found Dataview block at position:', blockStart)
      console.log('Dataview content:', dataviewContent)

      let processedLinks = []

      try {
        const result = await dataviewPlugin.api.query(dataviewContent)
        if (result.successful) {
          console.log('Dataview query result:', result.value)

          if (result.value.type === 'table' && result.value.headers) {
            if (result.value.headers[0] === 'File') {
              console.log('Found table with File column, processing links...')

              result.value.values.forEach((row) => {
                try {
                  if (row[0] && row[0].path) {
                    const fullPath = row[0].path
                    const fileName = fullPath
                      .split('/')
                      .pop()
                      .replace('.md', '')
                    const obsidianLink = `[[${fullPath}|${fileName}]]`
                    processedLinks.push(obsidianLink)
                    console.log('Processed link:', obsidianLink)
                  }
                } catch (linkError) {
                  console.log('Error processing row:', row)
                  console.error('Error creating link:', linkError)
                }
              })
            } else {
              console.log(
                'First column is not "File", skipping link processing'
              )
            }
          } else {
            console.log('Query result is not a table or has no headers')
          }
        } else {
          console.log('Dataview query failed:', result.error)
        }
      } catch (error) {
        console.error('Error executing dataview query:', error)
      }

      if (processedLinks.length > 0) {
        const formattedLinks = processedLinks.map((link) => `${link}  `)
        const linksWithSeparator = ['\n***  ', ...formattedLinks]

        let nextContentStart = content.indexOf('\n', blockEnd)
        if (nextContentStart === -1) {
          console.log('No next paragraph found, appending to end of file')
          content = `${content}\n\n${linksWithSeparator.join('\n')}`
          hasChanges = true
          // 更新正则表达式的位置以匹配新内容的末尾
          dataviewRegex.lastIndex = content.length
          continue
        }

        while (content[nextContentStart + 1] === '\n') {
          nextContentStart++
        }

        console.log('Inserting links at position:', nextContentStart)

        const beforeInsertion = content.slice(0, nextContentStart + 1)
        const afterInsertion = content.slice(nextContentStart + 1)
        content = `${beforeInsertion}${linksWithSeparator.join(
          '\n'
        )}\n\n${afterInsertion}`

        // 更新正则表达式的位置到插入内容之后
        dataviewRegex.lastIndex =
          nextContentStart + linksWithSeparator.join('\n').length + 2

        hasChanges = true
      }
    }

    if (hasChanges) {
      console.log('Changes detected, updating file...')
      await this.app.vault.modify(file, content)
      new obsidian.Notice('Processed links have been appended')
      console.log('File updated successfully')
    } else {
      console.log('No changes needed')
    }
  }

  async appendDataviewContent() {
    console.log('Manual append command triggered')

    const activeView = this.app.workspace.getActiveViewOfType(
      obsidian.MarkdownView
    )
    if (!activeView) {
      console.log('No active markdown view found')
      new obsidian.Notice('No active markdown view')
      return
    }

    const file = activeView.file
    if (!file) {
      console.log('No file is currently open')
      new obsidian.Notice('No file is currently open')
      return
    }

    console.log(`Processing file: ${file.path}`)
    await this.processDataviewBlocks(file)
  }

  // 添加新方法处理文末追加
  async appendDataviewContentToEnd() {
    console.log('Manual append to end command triggered')

    const activeView = this.app.workspace.getActiveViewOfType(
      obsidian.MarkdownView
    )
    if (!activeView) {
      console.log('No active markdown view found')
      new obsidian.Notice('No active markdown view')
      return
    }

    const file = activeView.file
    if (!file) {
      console.log('No file is currently open')
      new obsidian.Notice('No file is currently open')
      return
    }

    console.log(`Processing file: ${file.path}`)
    await this.processDataviewBlocksToEnd(file)
  }

  async processDataviewBlocksToEnd(file) {
    let content = await this.app.vault.read(file)
    console.log('Reading file content...')

    const dataviewPlugin = this.app.plugins.getPlugin('dataview')
    if (!dataviewPlugin) {
      console.log('Dataview plugin not found')
      return
    }

    const dataviewRegex = /```dataview\n([\s\S]*?)```/g
    let match
    let dataviewGroups = [] // 存储每个 dataview 的链接组
    let hasChanges = false

    while ((match = dataviewRegex.exec(content)) !== null) {
      const dataviewContent = match[1].trim()
      console.log('Found Dataview block, content:', dataviewContent)
      let currentGroupLinks = [] // 当前 dataview 的链接

      try {
        const result = await dataviewPlugin.api.query(dataviewContent)
        if (
          result.successful &&
          result.value.type === 'table' &&
          result.value.headers
        ) {
          if (result.value.headers[0] === 'File') {
            result.value.values.forEach((row) => {
              try {
                if (row[0] && row[0].path) {
                  const fullPath = row[0].path
                  const fileName = fullPath.split('/').pop().replace('.md', '')
                  const obsidianLink = `[[${fullPath}|${fileName}]]`
                  currentGroupLinks.push(obsidianLink)
                  console.log('Processed link:', obsidianLink)
                }
              } catch (linkError) {
                console.log('Error processing row:', row)
                console.error('Error creating link:', linkError)
              }
            })

            // 如果当前组有链接，添加到组列表
            if (currentGroupLinks.length > 0) {
              dataviewGroups.push(currentGroupLinks)
            }
          }
        }
      } catch (error) {
        console.error('Error executing dataview query:', error)
      }
    }

    // 如果有处理后的链接组，追加到文件末尾
    if (dataviewGroups.length > 0) {
      // 处理每个组的链接
      const formattedGroups = dataviewGroups.map((group) => {
        const formattedLinks = group.map((link) => `${link}  `)
        return ['\n***  ', ...formattedLinks].join('\n')
      })

      // 用空行连接不同的组
      content = `${content}\n\n${formattedGroups.join('\n\n')}`
      hasChanges = true
    }

    if (hasChanges) {
      console.log('Changes detected, updating file...')
      await this.app.vault.modify(file, content)
      new obsidian.Notice('All processed links have been appended to end')
      console.log('File updated successfully')
    } else {
      console.log('No changes needed')
      new obsidian.Notice('No links to append')
    }
  }

  onunload() {
    console.log('Unloading DataviewAppendPlugin...')
  }
}
