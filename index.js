const fs = require("fs");
const path = require("path");

const axios = require('axios');
const express = require('express');
const markdownpdf = require("markdown-pdf");
const builds = new Builds();

const { githubProvider } = require('./providers')(axios);

const app = express();

async function cache(req, res, next) {
    try {
        const { sha: latestSha } = await githubProvider.getLatestCommit('getify', 'You-Dont-Know-JS');
        
        if (builds.isAvailable(latestSha)) {
            res.sendFile(builds.latest());
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
        await builds.add(build);
        return res.sendFile(path.resolve(`./builds/${req.sha}/You-dont-know-JS.pdf`));
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





function Builds() {
    if (Builds.singleton) {
        return Builds.singleton;
    }

    this.available = null;
    this.building = false;

    if (!fs.existsSync('./builds')) {
        console.log('Folder builds does not exist, creating...');
        try {
            fs.mkdir('./builds', (err) => {
                if (err) { throw err }
                console.log('Folder builds has been created');
            });
        } catch (err) {
            console.exception('An error ocurred while creating builds folder', err);
        }
    };

    
    Builds.prototype.add = function(build) {
        return new Promise((resolve, reject) => {
            try {
                building = true;
                markdownpdf()
                    .concat
                    .from.strings(build.book.chapters.map(chapter => chapter.content))
                    .to(`./builds/${build.sha}/You-dont-know-JS.pdf`, () => {
                        console.log('Build saved');
                        this.available = build.sha;
                        resolve();
                    });
            } catch (err) {
                console.exception('Could not add a Build to storage', err);
                reject(err);
            } finally {
                building = false;
            }
        })
    }
        
    Builds.prototype.isAvailable = function(sha) {
        return this.available === sha;
    }

    Builds.prototype.latest = function() {
        return path.resolve(`./builds/${this.available}/You-dont-know-JS.pdf`);
    }
    
    Builds.singleton = this;
    return Builds.singleton;
}





function Build(githubProvider) {
    this.book;
    this.githubProvider = githubProvider;
    this.sha;
    this.timestamp;

    Build.prototype.exec = async function(book) {
        await this.download(book);
        const latestCommit = await this.githubProvider.getLatestCommit('getify', 'You-Dont-Know-JS');
        this.sha = latestCommit.sha;
        this.timestamp = new Date();
        this.book = book;
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
}
