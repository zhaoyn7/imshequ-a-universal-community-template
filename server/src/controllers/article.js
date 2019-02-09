const Article = require('../models/article')
const User = require('../models/user')
const marked = require('marked')

module.exports = {
  async fetchAll (req, res, next) {
    let { offset, limit } = req.query
    offset = parseInt(offset)
    limit = parseInt(limit)
    let countQuery = Article.countDocuments({})
    let articlesQuery = Article.find({}, '-rawContent -htmlContent', {
      sort: {createdAt: -1}, limit, skip: offset
    }).populate('author', '-password')
    let [ articlesCount, articles ] = await Promise.all([ countQuery, articlesQuery ])
    res.json({ articlesCount, articles })
  },
  async fetchOne (req, res, next) {
    let _id = req.params.id
    let doc = await Article.findOne({_id}, {}).populate('author', '-password')
    if (doc) {
      res.json({article: doc})
    }
  },
  async post (req, res, next) {
    let userId = req.user.id
    let { title, content, description } = req.body
    if ([title, description, rawContent].some( elem => elem.trim() === '' )) {
      let err = new Error('文章信息不完整')
      err.status = 400
      return next(err)
    }
    let htmlContent = marked(content)
    let doc = await Article.create({ title, description, rawContent: content, htmlContent, author: userId })
    if (doc) {
      res.json({id: doc._id})
    }
  },
  async delete (req, res, next) {
    try {
      let _id = req.params.id
      let result = await Article.deleteOne({_id})
      if (result.deletedCount !== 0) {
        res.end()
      } else {
        res.status(400).send('删除文章错误')
      }
    } catch (err) {
      next(err)
    }
  },
  async update (req, res, next) {
    try {
      let _id = req.params.id
      let {title, content, description} = req.body
      let htmlContent = marked(content)
      let doc = await Article.findOne({_id})
      doc = await doc.set({
        title, rawContent: content, htmlContent, description
      }).save()
      res.json({ id: doc._id })
    } catch (err) {
      next(err)
    }
  },
  async like (req, res, next) {
    try {
      let articleId = req.params.id
      // 将文章加入用户的like历史清单
      

      let userId = req.user.id
      let user = await User.findById(userId)
      if ( user.liked.indexOf(articleId) !== -1 ) { 
        res.sendStatus(400)
      } else {
        user.liked.push(articleId)
        await user.save()
      }

      // 更新文章的like数
      let result = await Article.updateOne( {_id: articleId}, { $inc: {likesCount: 1} } )
      if (result.nModified !== 0) {
        let article = await Article.findById(articleId)
          .populate('author', '-password')

        User.addLiked(articleId)
        article.isLiked = User.checkLiked(articleId) ? true : false 

        res.json({article})
      }
    } catch (err) {
      next(err)
    }
  },
  async unlike (req, res, next) {
    try {
      
    } catch (err) {
      next(err)
    }
  }
}