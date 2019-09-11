const markdownpdf = require("markdown-pdf");
const fs = require("fs");
const path = require("path");
const axios = require('axios');
const express = require('express');

const { githubProvider } = require('./providers')(axios);

const app = express();

async function cache(req, res, next) {
    try {
        const { sha: latestSha } = await githubProvider.getLatestCommit('getify', 'You-Dont-Know-JS');
        const build = new Build(githubProvider);
        
        if (build.upToDate(latestSha)) {
            return res.sendFile(path.resolve(`./builds/${latestSha}/You-dont-know-JS.pdf`));
        } else {
            req.sha = latestSha;
            next();
        }
    } catch (err) {
        next(err);
    }
}

app.get('/', cache, async (req, res) => {
    const chapters = [
        {title: 'Preface', url: '1st-ed/preface.md'},
        {title: 'Table of Contents', url: '1st-ed/up%20%26%20going/toc.md'},
        {title: 'Foreword (by Jenn Lukas)', url: '1st-ed/up%20%26%20going/foreword.md'},
        {title: 'Preface', url: '1st-ed/preface.md'},
        {title: 'Chapter 1: Into Programming', url: '1st-ed/up%20%26%20going/ch1.md'},
        {title: 'Chapter 2: Into JavaScript', url: '1st-ed/up%20%26%20going/ch2.md'},
        {title: 'Chapter 3: Into YDKJS', url: '1st-ed/up%20%26%20going/ch3.md'},
        {title: "Appendix A: Thank You's!", url: '1st-ed/up%20%26%20going/apA.md'},
    ];
    
    const book = new Book();
    
    chapters.forEach((chapter, i) => {
        book.addChapter(new Chapter(i, chapter.title, chapter.url));
    });
    
    try {
        const build = new Build(githubProvider);
        await build.exec(book);
        return res.sendFile(path.resolve(`./builds/${req.latestSha}/You-dont-know-JS.pdf`));
    } catch (err) {
        console.log(err);
        return res.status(500);
    }
});

app.listen(3000, () => console.log('Listening on port 3000'));





function Book() {
    this.chapters = [];
    this.media = [];

    Book.prototype.addChapter = function(chapter) {
        this.chapters.push(chapter);
    }    
}





function Chapter(number, title, url) {
    this.number = number;
    this.title = title;
    this.url = url;
    this.content;
}





function Build(githubProvider) {
    this.githubProvider = githubProvider;
    this.timestamp;
    this.sha;

    if (!fs.existsSync('./builds')) {
        fs.mkdir('./builds', (err) => {});
    };

    Build.prototype.exec = async function(book) {
        await this.download(book);
        const latestCommit = await this.githubProvider.getLatestCommit('getify', 'You-Dont-Know-JS');
        this.sha = latestCommit.sha;
        this.timestamp = new Date();
        await this.save(book);
    }

    Build.prototype.download = async function(book) {
        const promises = [];
        for (let i = 0; i < book.chapters.length; i++) {
            promises.push(
                this.githubProvider.getRaw('getify', 'You-Dont-Know-JS', book.chapters[i].url)
            );
        }
        const results = await Promise.all(promises);
        results.forEach((result, i) => { book.chapters[i].content = result.data; });
    }

    Build.prototype.save = async function(book) {
        await markdownpdf()
            .concat
            .from.strings(book.chapters.map(chapter => chapter.content))
            .to(`./builds/${this.sha}/You-dont-know-JS.pdf`, () => console.log('Generacion terminada'));
        
        // await markdownpdf()
        //     .concat
        //     .from.path(`./builds/${this.sha}/data)
        //     .to(`./builds/${this.sha}/You-dont-know-JS.pdf`, () => console.log('Generacion terminada'));
        
        fs.writeFile('./builds/latest', this.sha, (err) => {});
    }

    Build.prototype.upToDate = function(sha) {
        return this.latest() === sha;
    }

    Build.prototype.latest = function() {
        this.fileExists = (fs.existsSync('./builds/latest'));
        if (!this.fileExists) {
            fs.writeFileSync('./builds/latest', '');
        }
        return fs.readFileSync('./builds/latest', { encoding: 'utf8' });
    }
}
