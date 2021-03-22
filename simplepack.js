const fs = require('fs')
const path = require('path')
const babylon = require('@babel/parser')
const traverse = require('@babel/traverse').default
const babel = require('@babel/core')

let ID = 0;
// 读取文件信息，并获得当前js文件的依赖关系
function createAsset(filename) {
    const fileContent = fs.readFileSync(filename, 'utf-8')

    const ast = babylon.parse(fileContent, {
        sourceType: 'module'
    })

    //用来存储 文件所依赖的模块，简单来说就是，当前js文件 import 了哪些文件，都会保存在这个数组里
    const dependencies = []

    // 遍历ast
    traverse(ast, {
        ImportDeclaration: ({ node }) => {
            dependencies.push(node.source.value)
        }
    })

    const id = ID++

    // 把es6代码转换为es5
    const { code } = babel.transformFromAstSync(ast, null, {
        presets: ['@babel/preset-env']
    })

    return {
        id,
        filename,
        dependencies,
        code
    }
}

// 从入口开始分析所有依赖项，形成依赖图，采用广度遍历
function createGraph(entry) {
    const entryAsset = createAsset(entry)
    const queue = [entryAsset]
    for (const asset of queue) {
        let dirname = path.dirname(asset.filename)
        //新增一个属性来保存 子依赖项:ID
        //类似这样的数据结构 --->  {"./message.js" : 1}
        asset.mapping = {}
        asset.dependencies.forEach((depRelativePath) => {
            const depAbsolutePath = path.join(dirname, depRelativePath)
            const depAsset = createAsset(depAbsolutePath)

            asset.mapping[depRelativePath] = depAsset.id

            queue.push(depAsset)
        })
    }
    return queue
}

// 根据生成的依赖关系图，生成浏览器可执行代码
function bundle(graph) {
    let modules = ''

    graph.forEach((asset) => {
        modules += `${asset.id}:[
            function (require, module, exports){
              ${asset.code}
            },
            ${JSON.stringify(asset.mapping)},
          ],`
    })

    const result = `
    (function(modules){
      function require(id){
        const [fn, mapping] = modules[id];
        function localRequire(relativePath){
          return require(mapping[relativePath]);
        }
        const module = {exports:{}};
        fn(localRequire,module,module.exports);
        return module.exports;
      }
      //执行入口文件，
      require(0);
    })({${modules}})
  `

    return result
}

const graph = createGraph('./example/entry.js')
const bundleCode = bundle(graph)
fs.writeFileSync('./bundle.js', bundleCode)